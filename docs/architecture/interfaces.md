# RVDE Module Interfaces

Phase 1 defines the public contracts between RVDE subsystems. Every module implements
`RVDEModule` and exposes a domain-specific interface. Implementations are replaceable;
callers depend only on these contracts.

---

## Design Principles

1. **Interface-first** — Contracts are defined before implementations.
2. **Browser-native** — No Node.js APIs. All types use Web Platform primitives.
3. **Explicit lifecycle** — Every module has `initialize` and `shutdown` phases.
4. **Fail-fast** — Boot aborts if required capabilities or modules are unavailable.
5. **Typed errors** — All operations return `RVDEResult<T>` with structured error codes.

---

## Base Types

### RVDEModule

Every subsystem implements this lifecycle contract:

```typescript
interface RVDEModule {
  readonly name: ModuleName;
  readonly version: string;
  readonly dependencies: readonly ModuleName[];

  initialize(context: ModuleContext): Promise<RVDEResult<void>>;
  shutdown(): Promise<RVDEResult<void>>;
  healthCheck(): Promise<RVDEResult<HealthStatus>>;
}
```

### ModuleContext

Passed to each module during initialization. Provides access to already-initialized
dependencies and shared kernel services.

```typescript
interface ModuleContext {
  readonly kernelId: KernelId;
  readonly capabilities: BrowserCapabilities;
  getModule<T extends RVDEModule>(name: ModuleName): T | undefined;
  emit(event: KernelEvent): void;
}
```

### RVDEResult

Discriminated union for operation results:

```typescript
type RVDEResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RVDEError };
```

---

## Phase 1 Modules

### BrowserBridge (`browser`)

Adapts browser APIs to RVDE's hardware abstraction layer.

| Method | Description |
|--------|-------------|
| `detectCapabilities()` | Probe browser for required and optional features |
| `getNavigator()` | Returns frozen capability snapshot |
| `requestStorage()` | Acquire OPFS root handle |
| `createWorker(spec)` | Spawn a Web Worker for virtual CPU |

**Dependencies:** none (first module initialized)

---

### MemoryManager (`memory`)

Manages virtual memory backed by SharedArrayBuffer.

| Method | Description |
|--------|-------------|
| `allocate(size, options?)` | Reserve a memory region |
| `deallocate(regionId)` | Release a memory region |
| `map(processId, regionId)` | Attach region to a virtual process |
| `unmap(processId, regionId)` | Detach region from a virtual process |
| `getRegion(regionId)` | Inspect a region's metadata |
| `getStats()` | Return allocator statistics |

**Dependencies:** `browser`

**Requires capability:** `sharedArrayBuffer`, `crossOriginIsolated`

---

### Scheduler (`scheduler`)

Manages virtual process lifecycle and worker assignment.

| Method | Description |
|--------|-------------|
| `spawn(spec)` | Create a new virtual process |
| `terminate(processId)` | Stop a virtual process |
| `schedule()` | Run one scheduling tick |
| `getProcess(processId)` | Retrieve process metadata |
| `listProcesses()` | List all active processes |

**Dependencies:** `browser`, `memory`

**Requires capability:** `webWorkers`

---

### IPC (`ipc`)

Inter-process communication between virtual processes.

| Method | Description |
|--------|-------------|
| `createChannel(options?)` | Open a new IPC channel |
| `closeChannel(channelId)` | Close a channel |
| `send(channelId, message)` | Send a message on a channel |
| `receive(channelId)` | Dequeue next message (async) |
| `registerHandler(processId, handler)` | Bind a process to a message handler |

**Dependencies:** `scheduler`

---

### StorageDriver (`storage`)

Low-level persistence via OPFS and IndexedDB.

| Method | Description |
|--------|-------------|
| `initialize()` | Acquire storage backends |
| `read(path)` | Read raw bytes from persistent storage |
| `write(path, data)` | Write raw bytes to persistent storage |
| `delete(path)` | Remove a stored object |
| `exists(path)` | Check if a path exists |
| `list(prefix?)` | List stored paths under a prefix |

**Dependencies:** `browser`

**Requires capability:** `opfs`

---

### VirtualFileSystem (`vfs`)

POSIX-like filesystem abstraction over the storage driver.

| Method | Description |
|--------|-------------|
| `mount(mountPoint, source)` | Mount a storage backend at a path |
| `unmount(mountPoint)` | Unmount a filesystem |
| `open(path, flags)` | Open a file handle |
| `close(handleId)` | Close a file handle |
| `read(handleId, buffer, offset)` | Read from an open file |
| `write(handleId, buffer, offset)` | Write to an open file |
| `mkdir(path)` | Create a directory |
| `stat(path)` | Get file/directory metadata |

**Dependencies:** `storage`

---

### SecurityLayer (`security`)

Capability-based access control for RVDE resources.

| Method | Description |
|--------|-------------|
| `grant(processId, capability)` | Grant a capability to a process |
| `revoke(processId, capability)` | Revoke a capability |
| `check(processId, capability)` | Verify a process holds a capability |
| `audit(from, to, action)` | Log a security-relevant action |

**Dependencies:** `scheduler`

---

## Kernel (`core`)

Orchestrates module initialization, boot, and shutdown.

| Method | Description |
|--------|-------------|
| `boot(options?)` | Run the full boot sequence |
| `shutdown()` | Gracefully tear down all modules |
| `getState()` | Current kernel lifecycle state |
| `getModule(name)` | Retrieve an initialized module |

**Boot order:**

```
browser → memory → storage → vfs → security → scheduler → ipc
```

---

## Module Dependency Graph

```
                    ┌─────────────┐
                    │   browser   │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │  memory  │   │ storage  │   │ (future) │
     └────┬─────┘   └────┬─────┘   └──────────┘
          │              │
          │              ▼
          │        ┌──────────┐
          │        │   vfs    │
          │        └──────────┘
          ▼
     ┌──────────┐
     │scheduler │
     └────┬─────┘
          │
     ┌────┴─────┐
     ▼          ▼
┌─────────┐ ┌──────────┐
│   ipc   │ │ security │
└─────────┘ └──────────┘
```

---

## Error Codes (Phase 1)

| Code | Meaning |
|------|---------|
| `CAPABILITY_MISSING` | Required browser feature unavailable |
| `MODULE_NOT_FOUND` | Referenced module not registered |
| `MODULE_INIT_FAILED` | Module initialization returned error |
| `BOOT_SEQUENCE_FAILED` | Boot aborted during a phase |
| `MEMORY_ALLOC_FAILED` | SharedArrayBuffer allocation failed |
| `STORAGE_UNAVAILABLE` | OPFS not accessible |
| `PROCESS_NOT_FOUND` | Virtual process ID invalid |
| `IPC_CHANNEL_CLOSED` | Message sent on closed channel |
| `VFS_NOT_MOUNTED` | Operation on unmounted path |
| `PERMISSION_DENIED` | Security capability check failed |
