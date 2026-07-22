import type { BrowserCapabilities, CapabilityProfile } from './capabilities.js';
import type { RVDEError } from './errors.js';
import type { KernelId, MountPointId } from './ids.js';
import type { KernelState, ModuleName } from './module.js';

/** Boot phase identifiers matching boot-sequence.md. */

export const BootPhase = {
  CAPABILITY_DETECTION: 'capability_detection',
  BROWSER_BRIDGE: 'browser_bridge',
  MEMORY_MANAGER: 'memory_manager',
  STORAGE_DRIVER: 'storage_driver',
  VIRTUAL_FILESYSTEM: 'virtual_filesystem',
  SECURITY_LAYER: 'security_layer',
  SCHEDULER: 'scheduler',
  IPC: 'ipc',
  KERNEL_READY: 'kernel_ready',
} as const;

export type BootPhase = (typeof BootPhase)[keyof typeof BootPhase];

/** Record of a completed boot phase. */

export interface BootPhaseRecord {
  readonly phase: BootPhase;
  readonly success: boolean;
  readonly durationMs: number;
  readonly error?: RVDEError;
}

/** Event emitted during boot for observability. */

export interface BootPhaseEvent {
  readonly phase: BootPhase;
  readonly status: 'start' | 'complete' | 'error';
  readonly durationMs?: number;
  readonly error?: RVDEError;
}

/** VFS mount specification passed at boot. */

export interface MountSpec {
  readonly mountPoint: string;
  readonly source: string;
  readonly readonly?: boolean;
}

/** Options for kernel boot. */

export interface BootOptions {
  /** Total virtual memory to pre-allocate in bytes. Default: 16 MB. */
  readonly memoryLimit?: number;

  /** VFS mount configuration. Default: root OPFS mount. */
  readonly mounts?: readonly MountSpec[];

  /** Modules to skip (for testing). */
  readonly skipModules?: readonly ModuleName[];

  /** Abort boot if optional capability is missing. Default: false. */
  readonly strict?: boolean;

  /** Boot phase event listener. */
  readonly onPhase?: (event: BootPhaseEvent) => void;
}

/** Result returned after boot completes or fails. */

export interface BootResult {
  readonly success: boolean;
  readonly kernelId: KernelId;
  readonly state: KernelState;
  readonly profile: CapabilityProfile;
  readonly capabilities: BrowserCapabilities;
  readonly phases: readonly BootPhaseRecord[];
  readonly modules: readonly ModuleName[];
  readonly durationMs: number;
  readonly error?: RVDEError;
}

/** Default boot configuration values. */

export const BOOT_DEFAULTS = {
  MEMORY_LIMIT: 16 * 1024 * 1024,
  WORKER_PROBE_TIMEOUT_MS: 500,
  BOOT_PHASE_TIMEOUT_MS: 10_000,
} as const;

export type { MountPointId };
