import type { RVDEResult } from './result.js';

/** Storage backend type identifiers. */

export const StorageBackend = {
  OPFS: 'opfs',
  INDEXED_DB: 'indexeddb',
  MEMORY: 'memory',
} as const;

export type StorageBackend = (typeof StorageBackend)[keyof typeof StorageBackend];

/** Storage driver statistics. */

export interface StorageStats {
  readonly backend: StorageBackend;
  readonly totalObjects: number;
  readonly totalBytes: number;
  readonly available: boolean;
}

/** Low-level persistent storage driver interface. */

export interface StorageDriver {
  read(path: string): Promise<RVDEResult<Uint8Array>>;
  write(path: string, data: Uint8Array): Promise<RVDEResult<void>>;
  delete(path: string): Promise<RVDEResult<void>>;
  exists(path: string): Promise<RVDEResult<boolean>>;
  list(prefix?: string): Promise<RVDEResult<readonly string[]>>;
  getStats(): StorageStats;
}
