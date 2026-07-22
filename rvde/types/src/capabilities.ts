/** Browser capability detection types. */

export const CapabilityState = {
  AVAILABLE: 'available',
  DEGRADED: 'degraded',
  UNAVAILABLE: 'unavailable',
} as const;

export type CapabilityState = (typeof CapabilityState)[keyof typeof CapabilityState];

export const CapabilityProfile = {
  FULL: 'full',
  STANDARD: 'standard',
  MINIMAL: 'minimal',
} as const;

export type CapabilityProfile = (typeof CapabilityProfile)[keyof typeof CapabilityProfile];

/** Individual capability probe result. */

export interface CapabilityProbe {
  readonly name: string;
  readonly state: CapabilityState;
  readonly required: boolean;
  readonly detail?: string;
  readonly durationMs: number;
}

/** Frozen snapshot of browser hardware capabilities. */

export interface BrowserCapabilities {
  readonly crossOriginIsolated: CapabilityState;
  readonly sharedArrayBuffer: CapabilityState;
  readonly webWorkers: CapabilityState;
  readonly webAssembly: CapabilityState;
  readonly opfs: CapabilityState;
  readonly webGPU: CapabilityState;
  readonly webGL: CapabilityState;
  readonly indexedDB: CapabilityState;
  readonly webSocket: CapabilityState;
  readonly webRTC: CapabilityState;
  readonly profile: CapabilityProfile;
  readonly probes: readonly CapabilityProbe[];
  readonly detectedAt: number;
  readonly userAgent: string;
}

/** Required capabilities for Phase 1 boot. */

export const REQUIRED_CAPABILITIES = [
  'crossOriginIsolated',
  'sharedArrayBuffer',
  'webWorkers',
  'webAssembly',
] as const;

export type RequiredCapability = (typeof REQUIRED_CAPABILITIES)[number];

/** Phase 1 required but degradable capabilities. */

export const PHASE1_CAPABILITIES = [...REQUIRED_CAPABILITIES, 'opfs'] as const;

export type Phase1Capability = (typeof PHASE1_CAPABILITIES)[number];
