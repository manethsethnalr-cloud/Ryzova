import type { MemoryRegionId, ProcessId } from './ids.js';
import type { RVDEResult } from './result.js';

/** Memory region protection flags. */

export const MemoryProtection = {
  NONE: 0,
  READ: 1 << 0,
  WRITE: 1 << 1,
  EXECUTE: 1 << 2,
} as const;

export type MemoryProtection = number;

/** Memory region metadata. */

export interface MemoryRegion {
  readonly id: MemoryRegionId;
  readonly size: number;
  readonly offset: number;
  readonly protection: MemoryProtection;
  readonly shared: boolean;
  readonly buffer: SharedArrayBuffer;
}

/** Options for memory allocation. */

export interface AllocateOptions {
  readonly protection?: MemoryProtection;
  readonly shared?: boolean;
  readonly alignment?: number;
}

/** Memory allocator statistics. */

export interface MemoryStats {
  readonly totalBytes: number;
  readonly usedBytes: number;
  readonly freeBytes: number;
  readonly regionCount: number;
  readonly mappedProcessCount: number;
}

/** Virtual memory manager interface. */

export interface MemoryManager {
  allocate(size: number, options?: AllocateOptions): Promise<RVDEResult<MemoryRegion>>;
  deallocate(regionId: MemoryRegionId): Promise<RVDEResult<void>>;
  map(processId: ProcessId, regionId: MemoryRegionId): Promise<RVDEResult<void>>;
  unmap(processId: ProcessId, regionId: MemoryRegionId): Promise<RVDEResult<void>>;
  getRegion(regionId: MemoryRegionId): RVDEResult<MemoryRegion>;
  getStats(): MemoryStats;
}
