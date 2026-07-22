import {
  CapabilityState,
  type BrowserBridge,
  type BrowserCapabilities,
  type RVDEModule,
  type ModuleContext,
  type RVDEResult,
  type WorkerHandle,
  type WorkerSpec,
  ModuleName,
  RVDEErrorCode,
  createError,
  ok,
  err,
} from '../../types/src/index.js';
import { detectCapabilities } from './capabilities.js';

const MODULE_VERSION = '0.1.0';

/**
 * Browser bridge module — adapts browser APIs to RVDE hardware abstraction.
 */
export class BrowserBridgeModule implements BrowserBridge, RVDEModule {
  readonly name = ModuleName.BROWSER;
  readonly version = MODULE_VERSION;
  readonly dependencies = [] as const;

  private capabilities: BrowserCapabilities | undefined;
  private opfsRoot: FileSystemDirectoryHandle | undefined;
  private workers = new Map<string, WorkerHandle>();
  private nextWorkerId = 1;

  async initialize(_context: ModuleContext): Promise<RVDEResult<void>> {
    const detection = await this.detectCapabilities();
    if (!detection.ok) {
      return detection;
    }

    if (detection.value.opfs === CapabilityState.AVAILABLE) {
      const root = await this.getOpfsRoot();
      if (root.ok) {
        this.opfsRoot = root.value;
      }
    }

    return ok(undefined);
  }

  async shutdown(): Promise<RVDEResult<void>> {
    for (const handle of this.workers.values()) {
      handle.worker.terminate();
    }
    this.workers.clear();
    this.opfsRoot = undefined;
    this.capabilities = undefined;
    return ok(undefined);
  }

  async healthCheck(): Promise<RVDEResult<import('../../types/src/module.js').HealthStatus>> {
    return ok({
      healthy: this.capabilities !== undefined,
      message: this.capabilities ? 'Browser bridge operational' : 'Capabilities not detected',
      checkedAt: Date.now(),
    });
  }

  async detectCapabilities(): Promise<RVDEResult<BrowserCapabilities>> {
    try {
      this.capabilities = await detectCapabilities();
      return ok(this.capabilities);
    } catch (error) {
      return err(
        createError(RVDEErrorCode.CAPABILITY_MISSING, 'Capability detection failed', {
          module: this.name,
          cause: error,
        }),
      );
    }
  }

  getCapabilities(): BrowserCapabilities | undefined {
    return this.capabilities;
  }

  async getOpfsRoot(): Promise<RVDEResult<FileSystemDirectoryHandle>> {
    if (this.opfsRoot) {
      return ok(this.opfsRoot);
    }

    if (!navigator.storage?.getDirectory) {
      return err(
        createError(RVDEErrorCode.STORAGE_UNAVAILABLE, 'OPFS not available', {
          module: this.name,
        }),
      );
    }

    try {
      this.opfsRoot = await navigator.storage.getDirectory();
      return ok(this.opfsRoot);
    } catch (error) {
      return err(
        createError(RVDEErrorCode.STORAGE_UNAVAILABLE, 'Failed to acquire OPFS root', {
          module: this.name,
          cause: error,
        }),
      );
    }
  }

  async createWorker(spec: WorkerSpec): Promise<RVDEResult<WorkerHandle>> {
    try {
      const worker = new Worker(spec.scriptUrl, { type: spec.type ?? 'classic' });
      const id = `worker-${this.nextWorkerId++}`;
      const handle: WorkerHandle = {
        id,
        name: spec.name,
        worker,
        createdAt: Date.now(),
      };
      this.workers.set(id, handle);
      return ok(handle);
    } catch (error) {
      return err(
        createError(RVDEErrorCode.PROCESS_SPAWN_FAILED, `Failed to create worker: ${spec.name}`, {
          module: this.name,
          cause: error,
        }),
      );
    }
  }

  async terminateWorker(workerId: string): Promise<RVDEResult<void>> {
    const handle = this.workers.get(workerId);
    if (!handle) {
      return err(
        createError(RVDEErrorCode.PROCESS_NOT_FOUND, `Worker not found: ${workerId}`, {
          module: this.name,
        }),
      );
    }
    handle.worker.terminate();
    this.workers.delete(workerId);
    return ok(undefined);
  }

  listWorkers(): readonly WorkerHandle[] {
    return [...this.workers.values()];
  }
}

export function createBrowserBridge(): BrowserBridgeModule {
  return new BrowserBridgeModule();
}
