/**
 * Offline storage for the Playboard Composer using IndexedDB.
 *
 * Provides local persistence for plays, players, and annotations
 * with a sync queue for uploading to the server when online.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// Types for stored data
export interface StoredPlay {
  clientId: string;
  serverId: number | null;
  name: string;
  description: string | null;
  tags: string[] | null;
  fieldTemplateId: number | null;
  viewportZoom: number;
  viewportPanX: number;
  viewportPanY: number;
  localVersion: number;
  lastModified: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

export interface StoredPlayer {
  localId: string;
  playClientId: string;
  serverId: number | null;
  teamMemberId: number | null;
  xMeters: number;
  yMeters: number;
  displayNumber: number | null;
  displayName: string | null;
  teamColorOverride: string | null;
  teamSide: number;
  zIndex: number;
}

export interface StoredAnnotation {
  localId: string;
  playClientId: string;
  serverId: number | null;
  annotationType: 'LINE' | 'ARROW' | 'DASHED_LINE' | 'DASHED_ARROW';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
  zIndex: number;
}

export interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  entityType: 'play' | 'player' | 'annotation';
  clientId: string;
  playClientId: string;
  payload: unknown;
  timestamp: Date;
  retryCount: number;
}

// IndexedDB schema
interface PlayboardDB extends DBSchema {
  plays: {
    key: string;  // clientId
    value: StoredPlay;
    indexes: {
      'by-serverId': number;
      'by-syncStatus': string;
      'by-lastModified': Date;
    };
  };
  players: {
    key: string;  // localId
    value: StoredPlayer;
    indexes: {
      'by-playClientId': string;
    };
  };
  annotations: {
    key: string;  // localId
    value: StoredAnnotation;
    indexes: {
      'by-playClientId': string;
    };
  };
  syncQueue: {
    key: number;  // auto-increment
    value: SyncQueueItem;
    indexes: {
      'by-playClientId': string;
    };
  };
}

const DB_NAME = 'doublezero-playboard';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PlayboardDB> | null = null;

/**
 * Get or create the IndexedDB database instance
 */
export async function getDB(): Promise<IDBPDatabase<PlayboardDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PlayboardDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Plays store
      const playsStore = db.createObjectStore('plays', { keyPath: 'clientId' });
      playsStore.createIndex('by-serverId', 'serverId');
      playsStore.createIndex('by-syncStatus', 'syncStatus');
      playsStore.createIndex('by-lastModified', 'lastModified');

      // Players store
      const playersStore = db.createObjectStore('players', { keyPath: 'localId' });
      playersStore.createIndex('by-playClientId', 'playClientId');

      // Annotations store
      const annotationsStore = db.createObjectStore('annotations', { keyPath: 'localId' });
      annotationsStore.createIndex('by-playClientId', 'playClientId');

      // Sync queue store
      const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      syncStore.createIndex('by-playClientId', 'playClientId');
    },
  });

  return dbInstance;
}

// ============ PLAYS ============

export async function savePlay(play: StoredPlay): Promise<void> {
  const db = await getDB();
  await db.put('plays', play);
}

export async function getPlay(clientId: string): Promise<StoredPlay | undefined> {
  const db = await getDB();
  return db.get('plays', clientId);
}

export async function getPlayByServerId(serverId: number): Promise<StoredPlay | undefined> {
  const db = await getDB();
  return db.getFromIndex('plays', 'by-serverId', serverId);
}

export async function getAllPlays(): Promise<StoredPlay[]> {
  const db = await getDB();
  return db.getAll('plays');
}

export async function getPendingPlays(): Promise<StoredPlay[]> {
  const db = await getDB();
  return db.getAllFromIndex('plays', 'by-syncStatus', 'pending');
}

export async function deletePlay(clientId: string): Promise<void> {
  const db = await getDB();

  // Delete associated players and annotations
  const tx = db.transaction(['plays', 'players', 'annotations'], 'readwrite');

  const players = await tx.objectStore('players').index('by-playClientId').getAll(clientId);
  for (const player of players) {
    await tx.objectStore('players').delete(player.localId);
  }

  const annotations = await tx.objectStore('annotations').index('by-playClientId').getAll(clientId);
  for (const annotation of annotations) {
    await tx.objectStore('annotations').delete(annotation.localId);
  }

  await tx.objectStore('plays').delete(clientId);
  await tx.done;
}

// ============ PLAYERS ============

export async function savePlayer(player: StoredPlayer): Promise<void> {
  const db = await getDB();
  await db.put('players', player);
}

export async function getPlayersForPlay(playClientId: string): Promise<StoredPlayer[]> {
  const db = await getDB();
  return db.getAllFromIndex('players', 'by-playClientId', playClientId);
}

export async function deletePlayer(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete('players', localId);
}

export async function deletePlayersForPlay(playClientId: string): Promise<void> {
  const db = await getDB();
  const players = await db.getAllFromIndex('players', 'by-playClientId', playClientId);
  const tx = db.transaction('players', 'readwrite');
  for (const player of players) {
    await tx.store.delete(player.localId);
  }
  await tx.done;
}

/**
 * Atomically replace all players for a play in a single transaction.
 * This ensures no partial writes or data corruption.
 */
export async function replacePlayersForPlay(
  playClientId: string,
  players: StoredPlayer[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('players', 'readwrite');
  const store = tx.objectStore('players');

  // Delete all existing players for this play
  const existingPlayers = await store.index('by-playClientId').getAll(playClientId);
  for (const existing of existingPlayers) {
    store.delete(existing.localId);
  }

  // Add all new players
  for (const player of players) {
    store.put(player);
  }

  await tx.done;
}

// ============ ANNOTATIONS ============

export async function saveAnnotation(annotation: StoredAnnotation): Promise<void> {
  const db = await getDB();
  await db.put('annotations', annotation);
}

export async function getAnnotationsForPlay(playClientId: string): Promise<StoredAnnotation[]> {
  const db = await getDB();
  return db.getAllFromIndex('annotations', 'by-playClientId', playClientId);
}

export async function deleteAnnotation(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete('annotations', localId);
}

export async function deleteAnnotationsForPlay(playClientId: string): Promise<void> {
  const db = await getDB();
  const annotations = await db.getAllFromIndex('annotations', 'by-playClientId', playClientId);
  const tx = db.transaction('annotations', 'readwrite');
  for (const annotation of annotations) {
    await tx.store.delete(annotation.localId);
  }
  await tx.done;
}

/**
 * Atomically replace all annotations for a play in a single transaction.
 * This ensures no partial writes or data corruption.
 */
export async function replaceAnnotationsForPlay(
  playClientId: string,
  annotations: StoredAnnotation[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('annotations', 'readwrite');
  const store = tx.objectStore('annotations');

  // Delete all existing annotations for this play
  const existingAnnotations = await store.index('by-playClientId').getAll(playClientId);
  for (const existing of existingAnnotations) {
    store.delete(existing.localId);
  }

  // Add all new annotations
  for (const annotation of annotations) {
    store.put(annotation);
  }

  await tx.done;
}

// ============ SYNC QUEUE ============

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
  const db = await getDB();
  return db.add('syncQueue', item as SyncQueueItem);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAll('syncQueue');
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
}

export async function clearSyncQueueForPlay(playClientId: string): Promise<void> {
  const db = await getDB();
  const items = await db.getAllFromIndex('syncQueue', 'by-playClientId', playClientId);
  const tx = db.transaction('syncQueue', 'readwrite');
  for (const item of items) {
    if (item.id) {
      await tx.store.delete(item.id);
    }
  }
  await tx.done;
}

// ============ UTILITY ============

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['plays', 'players', 'annotations', 'syncQueue'], 'readwrite');
  await tx.objectStore('plays').clear();
  await tx.objectStore('players').clear();
  await tx.objectStore('annotations').clear();
  await tx.objectStore('syncQueue').clear();
  await tx.done;
}
