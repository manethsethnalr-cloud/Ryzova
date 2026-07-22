import type { ProcessId } from './ids.js';
import type { RVDEResult } from './result.js';

/** Security capability identifiers. */

export const SecurityCapability = {
  MEMORY_ALLOC: 'memory:alloc',
  MEMORY_MAP: 'memory:map',
  STORAGE_READ: 'storage:read',
  STORAGE_WRITE: 'storage:write',
  VFS_READ: 'vfs:read',
  VFS_WRITE: 'vfs:write',
  IPC_SEND: 'ipc:send',
  IPC_RECEIVE: 'ipc:receive',
  WORKER_SPAWN: 'worker:spawn',
  NETWORK_FETCH: 'network:fetch',
  NETWORK_WEBSOCKET: 'network:websocket',
  GPU_ACCESS: 'gpu:access',
  KERNEL_ADMIN: 'kernel:admin',
} as const;

export type SecurityCapability =
  (typeof SecurityCapability)[keyof typeof SecurityCapability];

/** Security audit log entry. */

export interface AuditEntry {
  readonly timestamp: number;
  readonly processId: ProcessId;
  readonly action: string;
  readonly target: string;
  readonly allowed: boolean;
}

/** Capability-based security layer interface. */

export interface SecurityLayer {
  grant(processId: ProcessId, capability: SecurityCapability): RVDEResult<void>;
  revoke(processId: ProcessId, capability: SecurityCapability): RVDEResult<void>;
  check(processId: ProcessId, capability: SecurityCapability): RVDEResult<boolean>;
  listCapabilities(processId: ProcessId): readonly SecurityCapability[];
  audit(from: ProcessId, to: string, action: string, allowed: boolean): void;
  getAuditLog(limit?: number): readonly AuditEntry[];
}
