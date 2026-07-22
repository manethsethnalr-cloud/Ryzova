/** Branded identifier types for type-safe IDs across subsystems. */

export type KernelId = string & { readonly __brand: 'KernelId' };
export type ProcessId = number & { readonly __brand: 'ProcessId' };
export type MemoryRegionId = number & { readonly __brand: 'MemoryRegionId' };
export type ChannelId = number & { readonly __brand: 'ChannelId' };
export type FileHandleId = number & { readonly __brand: 'FileHandleId' };
export type MountPointId = number & { readonly __brand: 'MountPointId' };

export function createKernelId(value: string): KernelId {
  return value as KernelId;
}

export function createProcessId(value: number): ProcessId {
  return value as ProcessId;
}

export function createMemoryRegionId(value: number): MemoryRegionId {
  return value as MemoryRegionId;
}

export function createChannelId(value: number): ChannelId {
  return value as ChannelId;
}

export function createFileHandleId(value: number): FileHandleId {
  return value as FileHandleId;
}

export function createMountPointId(value: number): MountPointId {
  return value as MountPointId;
}
