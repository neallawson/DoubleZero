import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { playsApi } from '../../../lib/api';
import type { Play, PlayPlayer, PlayAnnotation } from '../../../lib/api';
import {
  type StoredPlay,
  type StoredPlayer,
  type StoredAnnotation,
  savePlay,
  getPlay,
  getPlayByServerId,
  getAllPlays,
  deletePlay as deleteStoredPlay,
  savePlayer,
  getPlayersForPlay,
  replacePlayersForPlay,
  saveAnnotation,
  getAnnotationsForPlay,
  replaceAnnotationsForPlay,
  addToSyncQueue,
  getSyncQueue,
  removeSyncQueueItem,
  clearSyncQueueForPlay,
  clearAllData,
} from '../../../lib/playboard/offlineStorage';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline' | 'error';

interface UseOfflineSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;  // ms
}

/**
 * Hook for managing offline-first data persistence and synchronization.
 *
 * - Saves all changes to IndexedDB immediately
 * - Queues changes for server sync
 * - Auto-syncs when coming back online
 */
export function useOfflineSync(options: UseOfflineSyncOptions = {}) {
  const { autoSync = true, syncInterval = 30000 } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? 'synced' : 'offline');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const syncInProgress = useRef(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('pending');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && autoSync && syncStatus === 'pending') {
      processSyncQueue();
    }
  }, [isOnline, autoSync, syncStatus]);

  // Periodic sync
  useEffect(() => {
    if (!autoSync || !isOnline) return;

    const interval = setInterval(() => {
      if (!syncInProgress.current) {
        processSyncQueue();
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, isOnline, syncInterval]);

  /**
   * Process the sync queue - upload pending changes to server
   */
  const processSyncQueue = useCallback(async () => {
    if (syncInProgress.current || !isOnline) return;

    syncInProgress.current = true;
    setSyncStatus('syncing');

    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) {
        setSyncStatus('synced');
        syncInProgress.current = false;
        return;
      }

      // Group queue items by play
      const playClientIds = [...new Set(queue.map((item) => item.playClientId))];

      for (const playClientId of playClientIds) {
        const play = await getPlay(playClientId);
        if (!play) continue;

        const players = await getPlayersForPlay(playClientId);
        const annotations = await getAnnotationsForPlay(playClientId);

        const response = await playsApi.sync({
          plays: [{
            clientId: playClientId,
            serverId: play.serverId ?? undefined,
            play: {
              name: play.name,
              description: play.description ?? undefined,
              tags: play.tags ?? undefined,
              fieldTemplateId: play.fieldTemplateId ?? undefined,
            },
            players: players.map((p) => ({
              teamMemberId: p.teamMemberId,
              xMeters: p.xMeters,
              yMeters: p.yMeters,
              displayNumber: p.displayNumber,
              displayName: p.displayName,
              teamColorOverride: p.teamColorOverride,
              teamSide: p.teamSide,
              zIndex: p.zIndex,
            })),
            annotations: annotations.map((a) => ({
              annotationType: a.annotationType,
              startX: a.startX,
              startY: a.startY,
              endX: a.endX,
              endY: a.endY,
              color: a.color,
              strokeWidth: a.strokeWidth,
              zIndex: a.zIndex,
            })),
          }],
        });

        if (response.success && response.data) {
          const result = response.data.results[0];

          if (result.status === 'created' || result.status === 'updated') {
            // Update local play with server ID
            await savePlay({
              ...play,
              serverId: result.serverId,
              syncStatus: 'synced',
            });

            // Clear sync queue for this play
            await clearSyncQueueForPlay(playClientId);
          }
        }
      }

      setLastSyncedAt(new Date());
      setSyncStatus('synced');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    } finally {
      syncInProgress.current = false;
    }
  }, [isOnline]);

  /**
   * Create a new play locally
   */
  const createPlay = useCallback(async (name: string): Promise<string> => {
    const clientId = uuidv4();

    const play: StoredPlay = {
      clientId,
      serverId: null,
      name,
      description: null,
      tags: null,
      fieldTemplateId: null,
      viewportZoom: 1,
      viewportPanX: 0,
      viewportPanY: 0,
      localVersion: 1,
      lastModified: new Date(),
      syncStatus: 'pending',
    };

    await savePlay(play);

    await addToSyncQueue({
      operation: 'create',
      entityType: 'play',
      clientId,
      playClientId: clientId,
      payload: play,
      timestamp: new Date(),
      retryCount: 0,
    });

    if (isOnline) {
      setSyncStatus('pending');
    }

    return clientId;
  }, [isOnline]);

  /**
   * Load a play from local storage or server
   */
  const loadPlay = useCallback(async (idOrClientId: number | string): Promise<{
    play: StoredPlay;
    players: StoredPlayer[];
    annotations: StoredAnnotation[];
  } | null> => {
    // Try to load from local storage first (by clientId)
    if (typeof idOrClientId === 'string') {
      const play = await getPlay(idOrClientId);
      if (play) {
        const players = await getPlayersForPlay(idOrClientId);
        const annotations = await getAnnotationsForPlay(idOrClientId);
        return { play, players, annotations };
      }
    }

    // If it's a server ID, check if we have it locally first
    if (typeof idOrClientId === 'number') {
      const localPlay = await getPlayByServerId(idOrClientId);
      if (localPlay) {
        // We have this play locally - use local data (preserves unsaved changes)
        const players = await getPlayersForPlay(localPlay.clientId);
        const annotations = await getAnnotationsForPlay(localPlay.clientId);
        return { play: localPlay, players, annotations };
      }
    }

    // If it's a server ID, not found locally, and we're online, fetch from server
    if (typeof idOrClientId === 'number' && isOnline) {
      const response = await playsApi.get(idOrClientId);
      if (response.success && response.data) {
        const serverPlay = response.data;
        const clientId = serverPlay.clientId ?? uuidv4();

        const play: StoredPlay = {
          clientId,
          serverId: serverPlay.id,
          name: serverPlay.name,
          description: serverPlay.description,
          tags: serverPlay.tags,
          fieldTemplateId: serverPlay.fieldTemplateId,
          viewportZoom: serverPlay.viewportZoom ?? 1,
          viewportPanX: serverPlay.viewportPanX ?? 0,
          viewportPanY: serverPlay.viewportPanY ?? 0,
          localVersion: serverPlay.version,
          lastModified: new Date(serverPlay.updatedAt),
          syncStatus: 'synced',
        };

        await savePlay(play);

        // Save players
        const players: StoredPlayer[] = (serverPlay.players ?? []).map((p, i) => ({
          localId: uuidv4(),
          playClientId: clientId,
          serverId: p.id ?? null,
          teamMemberId: p.teamMemberId,
          xMeters: p.xMeters,
          yMeters: p.yMeters,
          displayNumber: p.displayNumber,
          displayName: p.displayName,
          teamColorOverride: p.teamColorOverride,
          teamSide: p.teamSide,
          zIndex: p.zIndex ?? i,
        }));

        await deletePlayersForPlay(clientId);
        for (const player of players) {
          await savePlayer(player);
        }

        // Save annotations
        const annotations: StoredAnnotation[] = (serverPlay.annotations ?? []).map((a, i) => ({
          localId: uuidv4(),
          playClientId: clientId,
          serverId: a.id ?? null,
          annotationType: a.annotationType,
          startX: a.startX,
          startY: a.startY,
          endX: a.endX,
          endY: a.endY,
          color: a.color,
          strokeWidth: a.strokeWidth,
          zIndex: a.zIndex ?? i,
        }));

        await deleteAnnotationsForPlay(clientId);
        for (const annotation of annotations) {
          await saveAnnotation(annotation);
        }

        return { play, players, annotations };
      }
    }

    return null;
  }, [isOnline]);

  /**
   * Save play data to local storage
   */
  const savePlayData = useCallback(async (
    playClientId: string,
    data: {
      name?: string;
      description?: string;
      tags?: string[];
      viewportZoom?: number;
      viewportPanX?: number;
      viewportPanY?: number;
    }
  ): Promise<void> => {
    const play = await getPlay(playClientId);
    if (!play) return;

    const updatedPlay: StoredPlay = {
      ...play,
      ...data,
      localVersion: play.localVersion + 1,
      lastModified: new Date(),
      syncStatus: 'pending',
    };

    await savePlay(updatedPlay);

    await addToSyncQueue({
      operation: 'update',
      entityType: 'play',
      clientId: playClientId,
      playClientId,
      payload: data,
      timestamp: new Date(),
      retryCount: 0,
    });

    if (isOnline) {
      setSyncStatus('pending');
    }
  }, [isOnline]);

  /**
   * Save players to local storage (atomic operation)
   */
  const savePlayers = useCallback(async (
    playClientId: string,
    players: Array<{
      id: string;
      x: number;
      y: number;
      number: number;
      name?: string;
      teamSide: 0 | 1;
      teamColor?: string;
      teamMemberId?: number;
    }>
  ): Promise<void> => {
    // Convert to storage format
    const storedPlayers: StoredPlayer[] = players.map((p, i) => ({
      localId: p.id,
      playClientId,
      serverId: null,
      teamMemberId: p.teamMemberId ?? null,
      xMeters: p.x,
      yMeters: p.y,
      displayNumber: p.number,
      displayName: p.name ?? null,
      teamColorOverride: p.teamColor ?? null,
      teamSide: p.teamSide,
      zIndex: i,
    }));

    // Atomic replace - delete all and insert all in one transaction
    await replacePlayersForPlay(playClientId, storedPlayers);

    // Mark play as pending sync
    const play = await getPlay(playClientId);
    if (play) {
      await savePlay({
        ...play,
        localVersion: play.localVersion + 1,
        lastModified: new Date(),
        syncStatus: 'pending',
      });
    }

    await addToSyncQueue({
      operation: 'update',
      entityType: 'player',
      clientId: uuidv4(),
      playClientId,
      payload: { players: storedPlayers },
      timestamp: new Date(),
      retryCount: 0,
    });

    if (isOnline) {
      setSyncStatus('pending');
    }
  }, [isOnline]);

  /**
   * Save annotations to local storage (atomic operation)
   */
  const saveAnnotations = useCallback(async (
    playClientId: string,
    annotations: Array<{
      id: string;
      annotationType: 'LINE' | 'ARROW' | 'DASHED_LINE' | 'DASHED_ARROW';
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      color: string;
      strokeWidth: number;
    }>
  ): Promise<void> => {
    // Convert to storage format
    const storedAnnotations: StoredAnnotation[] = annotations.map((a, i) => ({
      localId: a.id,
      playClientId,
      serverId: null,
      annotationType: a.annotationType,
      startX: a.startX,
      startY: a.startY,
      endX: a.endX,
      endY: a.endY,
      color: a.color,
      strokeWidth: a.strokeWidth,
      zIndex: i,
    }));

    // Atomic replace - delete all and insert all in one transaction
    await replaceAnnotationsForPlay(playClientId, storedAnnotations);

    // Mark play as pending sync
    const play = await getPlay(playClientId);
    if (play) {
      await savePlay({
        ...play,
        localVersion: play.localVersion + 1,
        lastModified: new Date(),
        syncStatus: 'pending',
      });
    }

    await addToSyncQueue({
      operation: 'update',
      entityType: 'annotation',
      clientId: uuidv4(),
      playClientId,
      payload: { annotations },
      timestamp: new Date(),
      retryCount: 0,
    });

    if (isOnline) {
      setSyncStatus('pending');
    }
  }, [isOnline]);

  /**
   * Delete a play locally and queue for server deletion
   */
  const deletePlay = useCallback(async (playClientId: string): Promise<void> => {
    const play = await getPlay(playClientId);
    if (!play) return;

    await deleteStoredPlay(playClientId);

    if (play.serverId) {
      await addToSyncQueue({
        operation: 'delete',
        entityType: 'play',
        clientId: playClientId,
        playClientId,
        payload: { serverId: play.serverId },
        timestamp: new Date(),
        retryCount: 0,
      });

      if (isOnline) {
        setSyncStatus('pending');
      }
    }
  }, [isOnline]);

  /**
   * Get all locally stored plays
   */
  const getLocalPlays = useCallback(async (): Promise<StoredPlay[]> => {
    return getAllPlays();
  }, []);

  /**
   * Force sync now
   */
  const syncNow = useCallback(async (): Promise<void> => {
    await processSyncQueue();
  }, [processSyncQueue]);

  return {
    // Status
    isOnline,
    syncStatus,
    lastSyncedAt,

    // Play operations
    createPlay,
    loadPlay,
    savePlayData,
    savePlayers,
    saveAnnotations,
    deletePlay,
    getLocalPlays,

    // Sync
    syncNow,

    // Debug/testing
    clearAllPlays: clearAllData,
  };
}
