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
  deletePlayersForPlay,
  replacePlayersForPlay,
  saveAnnotation,
  getAnnotationsForPlay,
  deleteAnnotationsForPlay,
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
  serverOnly?: boolean;   // Bypass IndexedDB, use server directly
}

/**
 * Hook for managing offline-first data persistence and synchronization.
 *
 * - Saves all changes to IndexedDB immediately
 * - Queues changes for server sync
 * - Auto-syncs when coming back online
 */
export function useOfflineSync(options: UseOfflineSyncOptions = {}) {
  const { autoSync = true, syncInterval = 30000, serverOnly = false } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? 'synced' : 'offline');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const syncInProgress = useRef(false);

  // Track current server play ID for server-only mode
  const currentServerPlayRef = useRef<{ id: number; version: number; clientId: string } | null>(null);

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
   * Create a new play locally (or on server in server-only mode)
   */
  const createPlay = useCallback(async (name: string): Promise<string> => {
    const clientId = uuidv4();

    // Server-only mode: create directly on server
    if (serverOnly) {
      setSyncStatus('syncing');
      try {
        const response = await playsApi.create({ name, clientId });
        if (response.success && response.data) {
          currentServerPlayRef.current = {
            id: response.data.id,
            version: response.data.version,
            clientId,
          };
          setSyncStatus('synced');
          setLastSyncedAt(new Date());
          // Return the server ID (as string) so the URL uses the numeric ID
          // that loadPlay can fetch in server-only mode
          return String(response.data.id);
        }
        throw new Error(response.error?.message || 'Failed to create play');
      } catch (error) {
        console.error('Server create failed:', error);
        setSyncStatus('error');
        throw error;
      }
    }

    // Offline-first mode: save locally and queue for sync
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
  }, [isOnline, serverOnly]);

  /**
   * Load a play from local storage or server
   */
  const loadPlay = useCallback(async (idOrClientId: number | string): Promise<{
    play: StoredPlay;
    players: StoredPlayer[];
    annotations: StoredAnnotation[];
  } | null> => {
    // Server-only mode: always fetch from server
    if (serverOnly) {
      // Must be a server ID in server-only mode
      const playId = typeof idOrClientId === 'number' ? idOrClientId : parseInt(idOrClientId, 10);
      if (isNaN(playId)) {
        console.error('Server-only mode requires numeric play ID');
        return null;
      }

      const response = await playsApi.get(playId);
      if (response.success && response.data) {
        const serverPlay = response.data;
        const clientId = serverPlay.clientId ?? uuidv4();

        // Store reference for saving
        currentServerPlayRef.current = {
          id: serverPlay.id,
          version: serverPlay.version,
          clientId,
        };

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

        return { play, players, annotations };
      }
      return null;
    }

    // Offline-first mode: try local storage first
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
  }, [isOnline, serverOnly]);

  /**
   * Save play data to local storage (or server in server-only mode)
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
    // Server-only mode: update directly on server
    if (serverOnly && currentServerPlayRef.current) {
      setSyncStatus('syncing');
      try {
        const response = await playsApi.update(currentServerPlayRef.current.id, {
          ...data,
          version: currentServerPlayRef.current.version,
        });
        if (response.success && response.data) {
          currentServerPlayRef.current.version = response.data.version;
          setSyncStatus('synced');
          setLastSyncedAt(new Date());
          return;
        }
        throw new Error(response.error?.message || 'Failed to update play');
      } catch (error) {
        console.error('Server update failed:', error);
        setSyncStatus('error');
        throw error;
      }
    }

    // Offline-first mode
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
  }, [isOnline, serverOnly]);

  /**
   * Save players to local storage (or server in server-only mode)
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
    // Convert to API format
    const apiPlayers: PlayPlayer[] = players.map((p, i) => ({
      teamMemberId: p.teamMemberId ?? null,
      xMeters: p.x,
      yMeters: p.y,
      displayNumber: p.number,
      displayName: p.name ?? null,
      teamColorOverride: p.teamColor ?? null,
      teamSide: p.teamSide,
      zIndex: i,
    }));

    // Server-only mode: update directly on server
    if (serverOnly && currentServerPlayRef.current) {
      setSyncStatus('syncing');
      try {
        const response = await playsApi.updatePlayers(currentServerPlayRef.current.id, apiPlayers);
        if (response.success) {
          setSyncStatus('synced');
          setLastSyncedAt(new Date());
          return;
        }
        throw new Error(response.error?.message || 'Failed to update players');
      } catch (error) {
        console.error('Server update players failed:', error);
        setSyncStatus('error');
        throw error;
      }
    }

    // Offline-first mode: save to IndexedDB
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
  }, [isOnline, serverOnly]);

  /**
   * Save annotations to local storage (or server in server-only mode)
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
    // Convert to API format
    const apiAnnotations: PlayAnnotation[] = annotations.map((a, i) => ({
      annotationType: a.annotationType,
      startX: a.startX,
      startY: a.startY,
      endX: a.endX,
      endY: a.endY,
      color: a.color,
      strokeWidth: a.strokeWidth,
      zIndex: i,
    }));

    // Server-only mode: update directly on server
    if (serverOnly && currentServerPlayRef.current) {
      setSyncStatus('syncing');
      try {
        const response = await playsApi.updateAnnotations(currentServerPlayRef.current.id, apiAnnotations);
        if (response.success) {
          setSyncStatus('synced');
          setLastSyncedAt(new Date());
          return;
        }
        throw new Error(response.error?.message || 'Failed to update annotations');
      } catch (error) {
        console.error('Server update annotations failed:', error);
        setSyncStatus('error');
        throw error;
      }
    }

    // Offline-first mode: save to IndexedDB
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
  }, [isOnline, serverOnly]);

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
