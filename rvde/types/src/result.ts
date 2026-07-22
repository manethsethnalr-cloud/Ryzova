import type { RVDEError } from './errors.js';

/** Discriminated union result type for all RVDE operations. */

export type RVDEResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: RVDEError };

export function ok<T>(value: T): RVDEResult<T> {
  return { ok: true, value };
}

export function err<T>(error: RVDEError): RVDEResult<T> {
  return { ok: false, error };
}

export function isOk<T>(result: RVDEResult<T>): result is { ok: true; value: T } {
  return result.ok;
}

export function isErr<T>(
  result: RVDEResult<T>,
): result is { ok: false; error: RVDEError } {
  return !result.ok;
}

export function unwrap<T>(result: RVDEResult<T>): T {
  if (result.ok) {
    return result.value;
  }
  throw new Error(`[${result.error.code}] ${result.error.message}`);
}
