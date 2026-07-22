import type { ProcessId } from './ids.js';
import type { RVDEResult } from './result.js';

/** Virtual process lifecycle states. */

export const ProcessState = {
  CREATED: 'created',
  READY: 'ready',
  RUNNING: 'running',
  BLOCKED: 'blocked',
  TERMINATED: 'terminated',
} as const;

export type ProcessState = (typeof ProcessState)[keyof typeof ProcessState];

/** Specification for spawning a virtual process. */

export interface ProcessSpec {
  readonly name: string;
  readonly entryPoint?: string;
  readonly memoryLimit?: number;
  readonly priority?: ProcessPriority;
}

export const ProcessPriority = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  KERNEL: 3,
} as const;

export type ProcessPriority = (typeof ProcessPriority)[keyof typeof ProcessPriority];

/** Virtual process metadata. */

export interface ProcessInfo {
  readonly id: ProcessId;
  readonly name: string;
  readonly state: ProcessState;
  readonly priority: ProcessPriority;
  readonly workerId?: string;
  readonly createdAt: number;
  readonly memoryRegions: readonly number[];
}

/** Scheduler statistics. */

export interface SchedulerStats {
  readonly totalProcesses: number;
  readonly runningProcesses: number;
  readonly readyQueueLength: number;
  readonly ticksProcessed: number;
}

/** Virtual process scheduler interface. */

export interface Scheduler {
  spawn(spec: ProcessSpec): Promise<RVDEResult<ProcessInfo>>;
  terminate(processId: ProcessId): Promise<RVDEResult<void>>;
  schedule(): Promise<RVDEResult<number>>;
  getProcess(processId: ProcessId): RVDEResult<ProcessInfo>;
  listProcesses(): readonly ProcessInfo[];
  getStats(): SchedulerStats;
}
