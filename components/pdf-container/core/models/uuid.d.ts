/**
 * Check whether the supplied string is a **valid RFC‑4122 v4 UUID**.
 * Works in every runtime (browser / Node / Deno) because it is just
 * string validation – no crypto required.
 */
export declare function isUuidV4(str: string): boolean
/**
 * Generate a **version‑4 UUID** (random).
 *
 * • Uses the native `crypto.randomUUID()` when available (all modern
 *   browsers, Deno, Node ≥ 16.9).
 * • Falls back to a tiny, standards‑compliant implementation that uses
 *   `crypto.getRandomValues` / `crypto.randomBytes` for entropy.
 *
 * @example
 * ```ts
 * import { uuidV4 } from "@embedpdf/models";
 * const id = uuidV4();
 * // → "36b8f84d-df4e-4d49-b662-bcde71a8764f"
 * ```
 */
export declare function uuidV4(): string
