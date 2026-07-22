# RVDE Boot Sequence

The boot sequence transforms a browser page load into a running RVDE kernel with
initialized virtual hardware. It is deterministic, observable, and fail-fast.

---

## Prerequisites

Before RVDE can boot, the hosting page must satisfy:

| Requirement | Reason |
|-------------|--------|
| `Cross-Origin-Opener-Policy: same-origin` | Enables SharedArrayBuffer |
| `Cross-Origin-Embedder-Policy: require-corp` | Enables cross-origin isolation |
| HTTPS or localhost | Secure context for OPFS and Workers |
| Modern Chromium browser | Target platform |

If cross-origin isolation is not active, RVDE enters `DEGRADED` mode and refuses
to initialize memory-dependent modules.

---

## Boot Phases

```
Phase 0: Capability Detection
Phase 1: Browser Bridge Initialization
Phase 2: Memory Manager Initialization
Phase 3: Storage Driver Initialization
Phase 4: Virtual File System Mount
Phase 5: Security Layer Initialization
Phase 6: Scheduler Initialization
Phase 7: IPC Initialization
Phase 8: Kernel Ready
```

Each phase emits a `BootPhaseEvent` for observability. Failure at any phase aborts
boot and returns a structured `BootResult` with the failing phase and error.

---

## Phase 0: Capability Detection

**Module:** `browser`

1. Probe `crossOriginIsolated` flag
2. Test SharedArrayBuffer construction
3. Test Web Worker creation and termination
4. Test WebAssembly module compilation
5. Probe OPFS via `navigator.storage.getDirectory()`
6. Probe WebGPU adapter request (optional)
7. Probe WebGL context (optional)
8. Classify each feature as `available`, `degraded`, or `unavailable`
9. Compute `CapabilityProfile`: `full`, `standard`, or `minimal`

**Gate:** If profile is `minimal`, boot aborts with `CAPABILITY_MISSING`.

---

## Phase 1: Browser Bridge Initialization

**Module:** `browser`

1. Freeze capability snapshot
2. Acquire OPFS root directory handle (if available)
3. Register bridge with kernel module registry

---

## Phase 2: Memory Manager Initialization

**Module:** `memory`

1. Verify `sharedArrayBuffer` capability
2. Pre-allocate kernel heap region (default 16 MB)
3. Initialize page table metadata structure
4. Register allocator with kernel

**Gate:** Requires `sharedArrayBuffer` + `crossOriginIsolated`.

---

## Phase 3: Storage Driver Initialization

**Module:** `storage`

1. Verify `opfs` capability
2. Bind OPFS root handle from browser bridge
3. Verify read/write access with a probe file
4. Register storage driver with kernel

**Gate:** Requires `opfs`. Boot continues in degraded mode without persistence
if OPFS is unavailable (logged as warning).

---

## Phase 4: Virtual File System Mount

**Module:** `vfs`

1. Create root mount point at `/`
2. Mount OPFS-backed storage at `/`
3. Create standard directories: `/tmp`, `/var`, `/home`
4. Register VFS with kernel

**Gate:** Requires storage driver. Skipped if storage unavailable.

---

## Phase 5: Security Layer Initialization

**Module:** `security`

1. Initialize capability registry
2. Grant kernel process full capabilities
3. Register security layer with kernel

---

## Phase 6: Scheduler Initialization

**Module:** `scheduler`

1. Verify `webWorkers` capability
2. Initialize ready queue and process table
3. Register scheduler with kernel

**Gate:** Requires `webWorkers`.

---

## Phase 7: IPC Initialization

**Module:** `ipc`

1. Initialize channel registry
2. Create kernel control channel
3. Register IPC with kernel

---

## Phase 8: Kernel Ready

1. Transition kernel state to `running`
2. Emit `kernel:ready` event
3. Return `BootResult` with capability profile, initialized modules, and timing

---

## Boot Configuration

```typescript
interface BootOptions {
  /** Total virtual memory to pre-allocate (bytes). Default: 16 MB */
  memoryLimit?: number;

  /** VFS mount configuration */
  mounts?: MountSpec[];

  /** Modules to skip (for testing) */
  skipModules?: ModuleName[];

  /** Abort boot on optional capability missing. Default: false */
  strict?: boolean;

  /** Boot phase event listener */
  onPhase?: (event: BootPhaseEvent) => void;
}
```

---

## Boot Result

```typescript
interface BootResult {
  success: boolean;
  kernelId: KernelId;
  state: KernelState;
  profile: CapabilityProfile;
  phases: BootPhaseRecord[];
  modules: ModuleName[];
  durationMs: number;
  error?: RVDEError;
}
```

---

## Shutdown Sequence

Shutdown runs in reverse boot order:

```
ipc → scheduler → security → vfs → storage → memory → browser
```

Each module's `shutdown()` is called sequentially. Errors are collected but do not
prevent subsequent modules from shutting down.

---

## State Machine

```
         boot()
  ┌──────────────────────────┐
  │                          │
  ▼                          │
uninitialized ──► booting ──► running ──► shutting_down ──► stopped
                    │                        ▲
                    │ boot failed            │
                    └──────► failed ─────────┘
                              shutdown()
```

---

## Phase 1 Success Criteria

RVDE Phase 1 boot is successful when:

1. Capability detection completes with profile `full` or `standard`
2. Memory manager allocates the kernel heap region
3. Storage driver binds to OPFS (or degrades gracefully)
4. VFS mounts root filesystem
5. Scheduler initializes with zero processes
6. IPC creates the kernel control channel
7. Kernel state transitions to `running`
8. Total boot time is recorded and returned
