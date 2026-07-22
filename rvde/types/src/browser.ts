import type { BrowserCapabilities } from './capabilities.js';
import type { RVDEResult } from './result.js';

/** Specification for creating a Web Worker via the browser bridge. */

export interface WorkerSpec {
  readonly name: string;
  readonly scriptUrl: string;
  readonly type?: 'classic' | 'module';
  readonly sharedMemory?: SharedArrayBuffer;
}

/** Active worker handle managed by the browser bridge. */

export interface WorkerHandle {
  readonly id: string;
  readonly name: string;
  readonly worker: Worker;
  readonly createdAt: number;
}

/** Browser bridge — adapts browser APIs to RVDE hardware abstraction. */

export interface BrowserBridge {
  detectCapabilities(): Promise<RVDEResult<BrowserCapabilities>>;
  getCapabilities(): BrowserCapabilities | undefined;
  getOpfsRoot(): Promise<RVDEResult<FileSystemDirectoryHandle>>;
  createWorker(spec: WorkerSpec): Promise<RVDEResult<WorkerHandle>>;
  terminateWorker(workerId: string): Promise<RVDEResult<void>>;
  listWorkers(): readonly WorkerHandle[];
}
