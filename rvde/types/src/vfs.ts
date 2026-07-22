import type { FileHandleId, MountPointId } from './ids.js';
import type { RVDEResult } from './result.js';

/** File open flags. */

export const FileFlags = {
  READ: 1 << 0,
  WRITE: 1 << 1,
  CREATE: 1 << 2,
  TRUNCATE: 1 << 3,
  APPEND: 1 << 4,
} as const;

export type FileFlags = number;

/** File type classification. */

export const FileType = {
  FILE: 'file',
  DIRECTORY: 'directory',
  SYMLINK: 'symlink',
  UNKNOWN: 'unknown',
} as const;

export type FileType = (typeof FileType)[keyof typeof FileType];

/** File/directory metadata. */

export interface FileStat {
  readonly path: string;
  readonly type: FileType;
  readonly size: number;
  readonly createdAt: number;
  readonly modifiedAt: number;
}

/** Open file handle metadata. */

export interface FileHandle {
  readonly id: FileHandleId;
  readonly path: string;
  readonly flags: FileFlags;
  readonly position: number;
}

/** Mount point metadata. */

export interface MountPoint {
  readonly id: MountPointId;
  readonly path: string;
  readonly source: string;
  readonly readonly: boolean;
}

/** POSIX-like virtual filesystem interface. */

export interface VirtualFileSystem {
  mount(mountPoint: string, source: string, readonly?: boolean): Promise<RVDEResult<MountPoint>>;
  unmount(mountPoint: string): Promise<RVDEResult<void>>;
  open(path: string, flags: FileFlags): Promise<RVDEResult<FileHandle>>;
  close(handleId: FileHandleId): Promise<RVDEResult<void>>;
  read(handleId: FileHandleId, buffer: Uint8Array, offset: number): Promise<RVDEResult<number>>;
  write(handleId: FileHandleId, buffer: Uint8Array, offset: number): Promise<RVDEResult<number>>;
  mkdir(path: string): Promise<RVDEResult<void>>;
  stat(path: string): Promise<RVDEResult<FileStat>>;
  listMounts(): readonly MountPoint[];
}
