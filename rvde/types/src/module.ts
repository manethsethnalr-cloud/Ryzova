import type { BrowserCapabilities } from './capabilities.js';
import type { KernelId } from './ids.js';
import type { RVDEResult } from './result.js';

/** Registered RVDE subsystem names. */

export const ModuleName = {
  BROWSER: 'browser',
  CORE: 'core',
  MEMORY: 'memory',
  SCHEDULER: 'scheduler',
  IPC: 'ipc',
  STORAGE: 'storage',
  VFS: 'vfs',
  SECURITY: 'security',
  RUNTIME: 'runtime',
  PROCESS: 'process',
} as const;

export type ModuleName = (typeof ModuleName)[keyof typeof ModuleName];

/** Kernel lifecycle states. */

export const KernelState = {
  UNINITIALIZED: 'uninitialized',
  BOOTING: 'booting',
  RUNNING: 'running',
  SHUTTING_DOWN: 'shutting_down',
  STOPPED: 'stopped',
  FAILED: 'failed',
} as const;

export type KernelState = (typeof KernelState)[keyof typeof KernelState];

/** Module health status returned by healthCheck(). */

export interface HealthStatus {
  readonly healthy: boolean;
  readonly message: string;
  readonly checkedAt: number;
}

/** Events emitted by the kernel during operation. */

export type KernelEvent =
  | { readonly type: 'kernel:booting' }
  | { readonly type: 'kernel:ready'; readonly kernelId: KernelId }
  | { readonly type: 'kernel:shutdown' }
  | { readonly type: 'kernel:error'; readonly error: string }
  | { readonly type: 'module:initialized'; readonly module: ModuleName }
  | { readonly type: 'module:shutdown'; readonly module: ModuleName };

/** Context passed to each module during initialization. */

export interface ModuleContext {
  readonly kernelId: KernelId;
  readonly capabilities: BrowserCapabilities;
  getModule<T extends RVDEModule>(name: ModuleName): T | undefined;
  emit(event: KernelEvent): void;
}

/** Base lifecycle contract for every RVDE subsystem. */

export interface RVDEModule {
  readonly name: ModuleName;
  readonly version: string;
  readonly dependencies: readonly ModuleName[];

  initialize(context: ModuleContext): Promise<RVDEResult<void>>;
  shutdown(): Promise<RVDEResult<void>>;
  healthCheck(): Promise<RVDEResult<HealthStatus>>;
}
