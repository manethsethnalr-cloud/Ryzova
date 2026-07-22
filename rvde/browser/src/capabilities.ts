import {
  CapabilityProfile,
  CapabilityState,
  type BrowserCapabilities,
  type CapabilityProbe,
} from '../../types/src/capabilities.js';
import { BOOT_DEFAULTS } from '../../types/src/boot.js';

const PROBE_FILE = '.rvde-capability-probe';
const PROBE_BYTES = new Uint8Array([0x52, 0x56, 0x44, 0x45]); // "RVDE"

type ProbeFn = () => Promise<CapabilityProbe>;

async function timedProbe(
  name: string,
  required: boolean,
  fn: () => Promise<{ state: CapabilityState; detail?: string }>,
): Promise<CapabilityProbe> {
  const start = performance.now();
  try {
    const result = await fn();
    return {
      name,
      required,
      state: result.state,
      detail: result.detail,
      durationMs: performance.now() - start,
    };
  } catch (error) {
    return {
      name,
      required,
      state: CapabilityState.UNAVAILABLE,
      detail: error instanceof Error ? error.message : String(error),
      durationMs: performance.now() - start,
    };
  }
}

async function probeCrossOriginIsolation(): Promise<{
  state: CapabilityState;
  detail?: string;
}> {
  const isolated = globalThis.crossOriginIsolated === true;
  return {
    state: isolated ? CapabilityState.AVAILABLE : CapabilityState.UNAVAILABLE,
    detail: isolated ? undefined : 'crossOriginIsolated is false — COOP/COEP headers required',
  };
}

async function probeSharedArrayBuffer(): Promise<{
  state: CapabilityState;
  detail?: string;
}> {
  if (!globalThis.crossOriginIsolated) {
    return {
      state: CapabilityState.UNAVAILABLE,
      detail: 'Requires cross-origin isolation',
    };
  }

  const sab = new SharedArrayBuffer(64);
  const view = new Uint8Array(sab);
  view[0] = 0xab;
  if (view[0] !== 0xab) {
    return { state: CapabilityState.DEGRADED, detail: 'Byte access verification failed' };
  }
  return { state: CapabilityState.AVAILABLE };
}

async function probeWebWorkers(): Promise<{ state: CapabilityState; detail?: string }> {
  const script = `
    self.onmessage = (event) => {
      if (event.data?.type === 'ping') {
        self.postMessage({ type: 'pong' });
      }
    };
  `;

  const blob = new Blob([script], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  try {
    const worker = new Worker(url);
    const result = await new Promise<{ state: CapabilityState; detail?: string }>(
      (resolve) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          resolve({ state: CapabilityState.DEGRADED, detail: 'Worker probe timed out' });
        }, BOOT_DEFAULTS.WORKER_PROBE_TIMEOUT_MS);

        worker.onmessage = (event) => {
          clearTimeout(timeout);
          worker.terminate();
          if (event.data?.type === 'pong') {
            resolve({ state: CapabilityState.AVAILABLE });
          } else {
            resolve({ state: CapabilityState.DEGRADED, detail: 'Unexpected worker response' });
          }
        };

        worker.onerror = () => {
          clearTimeout(timeout);
          worker.terminate();
          resolve({ state: CapabilityState.UNAVAILABLE, detail: 'Worker error during probe' });
        };

        worker.postMessage({ type: 'ping' });
      },
    );
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function probeWebAssembly(): Promise<{ state: CapabilityState; detail?: string }> {
  const bytes = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7f,
    0x03, 0x02, 0x01, 0x00,
    0x07, 0x08, 0x01, 0x04, 0x70, 0x72, 0x6f, 0x62, 0x65, 0x00, 0x00,
    0x0a, 0x06, 0x01, 0x04, 0x00, 0x41, 0x2a, 0x0b,
  ]);

  const { instance } = await WebAssembly.instantiate(bytes);
  const probe = instance.exports.probe as (() => number) | undefined;

  if (!probe || probe() !== 42) {
    return { state: CapabilityState.DEGRADED, detail: 'WASM probe function returned unexpected value' };
  }
  return { state: CapabilityState.AVAILABLE };
}

async function probeOpfs(): Promise<{ state: CapabilityState; detail?: string }> {
  if (!navigator.storage?.getDirectory) {
    return { state: CapabilityState.UNAVAILABLE, detail: 'navigator.storage.getDirectory not available' };
  }

  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(PROBE_FILE, { create: true });
  const writable = await handle.createWritable();
  await writable.write(PROBE_BYTES);
  await writable.close();

  const file = await handle.getFile();
  const read = new Uint8Array(await file.arrayBuffer());

  if (read.length !== PROBE_BYTES.length || !read.every((b, i) => b === PROBE_BYTES[i])) {
    return { state: CapabilityState.DEGRADED, detail: 'OPFS read/write verification failed' };
  }

  await root.removeEntry(PROBE_FILE);
  return { state: CapabilityState.AVAILABLE };
}

async function probeWebGPU(): Promise<{ state: CapabilityState; detail?: string }> {
  if (!navigator.gpu) {
    return { state: CapabilityState.UNAVAILABLE, detail: 'WebGPU not supported' };
  }
  const adapter = await navigator.gpu.requestAdapter();
  return adapter
    ? { state: CapabilityState.AVAILABLE }
    : { state: CapabilityState.DEGRADED, detail: 'No GPU adapter available' };
}

async function probeWebGL(): Promise<{ state: CapabilityState; detail?: string }> {
  const canvas = new OffscreenCanvas(1, 1);
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  return gl
    ? { state: CapabilityState.AVAILABLE }
    : { state: CapabilityState.UNAVAILABLE, detail: 'WebGL context unavailable' };
}

async function probeIndexedDB(): Promise<{ state: CapabilityState; detail?: string }> {
  if (!globalThis.indexedDB) {
    return { state: CapabilityState.UNAVAILABLE };
  }

  return new Promise((resolve) => {
    const request = indexedDB.open('__rvde_probe__', 1);
    request.onerror = () =>
      resolve({ state: CapabilityState.DEGRADED, detail: 'IndexedDB open failed' });
    request.onsuccess = () => {
      request.result.close();
      indexedDB.deleteDatabase('__rvde_probe__');
      resolve({ state: CapabilityState.AVAILABLE });
    };
  });
}

function probeWebSocket(): { state: CapabilityState; detail?: string } {
  return globalThis.WebSocket
    ? { state: CapabilityState.AVAILABLE }
    : { state: CapabilityState.UNAVAILABLE };
}

function probeWebRTC(): { state: CapabilityState; detail?: string } {
  return globalThis.RTCPeerConnection
    ? { state: CapabilityState.AVAILABLE }
    : { state: CapabilityState.UNAVAILABLE };
}

function computeProfile(probes: readonly CapabilityProbe[]): CapabilityProfile {
  const requiredFailed = probes.some(
    (p) => p.required && p.state === CapabilityState.UNAVAILABLE,
  );
  if (requiredFailed) {
    return CapabilityProfile.MINIMAL;
  }

  const optionalFailed = probes.some(
    (p) => !p.required && p.state !== CapabilityState.AVAILABLE,
  );
  return optionalFailed ? CapabilityProfile.STANDARD : CapabilityProfile.FULL;
}

function probeToState(probe: CapabilityProbe): CapabilityState {
  return probe.state;
}

/**
 * Detect all browser capabilities required and optional for RVDE.
 * Performs real functional probes, not feature-flag checks.
 */
export async function detectCapabilities(): Promise<BrowserCapabilities> {
  const probes: CapabilityProbe[] = await Promise.all([
    timedProbe('crossOriginIsolated', true, probeCrossOriginIsolation),
    timedProbe('sharedArrayBuffer', true, probeSharedArrayBuffer),
    timedProbe('webWorkers', true, probeWebWorkers),
    timedProbe('webAssembly', true, probeWebAssembly),
    timedProbe('opfs', false, probeOpfs),
    timedProbe('webGPU', false, probeWebGPU),
    timedProbe('webGL', false, probeWebGL),
    timedProbe('indexedDB', false, probeIndexedDB),
    timedProbe('webSocket', false, async () => probeWebSocket()),
    timedProbe('webRTC', false, async () => probeWebRTC()),
  ]);

  const byName = Object.fromEntries(probes.map((p) => [p.name, p])) as Record<
    string,
    CapabilityProbe
  >;

  return Object.freeze({
    crossOriginIsolated: probeToState(byName['crossOriginIsolated']!),
    sharedArrayBuffer: probeToState(byName['sharedArrayBuffer']!),
    webWorkers: probeToState(byName['webWorkers']!),
    webAssembly: probeToState(byName['webAssembly']!),
    opfs: probeToState(byName['opfs']!),
    webGPU: probeToState(byName['webGPU']!),
    webGL: probeToState(byName['webGL']!),
    indexedDB: probeToState(byName['indexedDB']!),
    webSocket: probeToState(byName['webSocket']!),
    webRTC: probeToState(byName['webRTC']!),
    profile: computeProfile(probes),
    probes: Object.freeze(probes),
    detectedAt: Date.now(),
    userAgent: navigator.userAgent,
  });
}

/**
 * Returns true if all required capabilities for Phase 1 boot are available.
 */
export function hasRequiredCapabilities(capabilities: BrowserCapabilities): boolean {
  return capabilities.profile !== CapabilityProfile.MINIMAL;
}
