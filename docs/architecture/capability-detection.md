# Browser Capability Detection

RVDE treats the browser as a hardware abstraction layer. Before boot, it probes
the host environment to determine which virtual hardware features are available.

---

## Detection Strategy

Each capability is tested with a **real operation**, not merely a feature flag check.
This avoids false positives from polyfills or partially implemented APIs.

| Capability | Detection Method | Required |
|------------|-----------------|----------|
| Cross-Origin Isolation | `globalThis.crossOriginIsolated === true` | Yes |
| SharedArrayBuffer | Construct and byte-access a 64-byte SAB | Yes |
| Web Workers | Create, postMessage, terminate a Worker | Yes |
| WebAssembly | Compile a minimal WASM module | Yes |
| OPFS | `navigator.storage.getDirectory()` + write probe | Yes (Phase 1) |
| WebGPU | `navigator.gpu.requestAdapter()` | No |
| WebGL | Create offscreen canvas + get context | No |
| IndexedDB | Open and close a test database | No |
| WebSocket | Check constructor existence | No |
| WebRTC | Check `RTCPeerConnection` existence | No |

---

## Capability Profiles

After detection, capabilities are classified into a profile:

### `full`

All required and all optional capabilities available.

### `standard`

All required capabilities available. Some optional capabilities missing.

### `minimal`

One or more required capabilities missing. **Boot is aborted.**

---

## Capability States

Each individual capability has one of three states:

| State | Meaning |
|-------|---------|
| `available` | Feature detected and functional |
| `degraded` | Feature exists but failed functional test |
| `unavailable` | Feature not present or blocked |

---

## Cross-Origin Isolation

SharedArrayBuffer requires cross-origin isolation. RVDE checks:

```typescript
const isolated = globalThis.crossOriginIsolated === true;
```

If not isolated, `sharedArrayBuffer` is marked `unavailable` regardless of
constructor existence. The hosting page must set:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

---

## OPFS Detection

OPFS detection performs a full read-write cycle:

1. Call `navigator.storage.getDirectory()`
2. Create a probe file `.rvde-capability-probe`
3. Write a known byte sequence
4. Read back and verify
5. Delete the probe file

This confirms both API availability and write access within the origin.

---

## SharedArrayBuffer Detection

1. Construct `new SharedArrayBuffer(64)`
2. Create a `Uint8Array` view
3. Write and read back a test byte
4. Verify the byte matches

If construction throws (e.g., without COOP/COEP), capability is `unavailable`.

---

## Web Worker Detection

1. Create a Worker from an inline Blob URL
2. Post a `{ type: 'ping' }` message
3. Wait for `{ type: 'pong' }` response (500 ms timeout)
4. Terminate the worker

Failure at any step marks `webWorkers` as `degraded` or `unavailable`.

---

## WebAssembly Detection

Compile and instantiate a minimal WASM module:

```
(module (func (export "probe") (result i32) i32.const 42))
```

Verify the exported function returns 42.

---

## Output: BrowserCapabilities

```typescript
interface BrowserCapabilities {
  crossOriginIsolated: CapabilityState;
  sharedArrayBuffer: CapabilityState;
  webWorkers: CapabilityState;
  webAssembly: CapabilityState;
  opfs: CapabilityState;
  webGPU: CapabilityState;
  webGL: CapabilityState;
  indexedDB: CapabilityState;
  webSocket: CapabilityState;
  webRTC: CapabilityState;
  profile: CapabilityProfile;
  detectedAt: number;
  userAgent: string;
}
```

---

## Usage in Boot Sequence

Phase 0 runs capability detection before any module initializes. Results are:

1. Stored in the frozen `BrowserCapabilities` snapshot
2. Passed to every module via `ModuleContext`
3. Used as gates for module initialization (see boot-sequence.md)
4. Included in the final `BootResult`

---

## Future: Capability Change Monitoring

Phase 2+ may watch for capability changes (e.g., tab backgrounding, permission
revocation). Phase 1 performs detection once at boot time.
