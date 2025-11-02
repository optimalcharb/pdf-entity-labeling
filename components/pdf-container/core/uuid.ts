/**
 * Check whether the supplied string is a **valid RFC‑4122 v4 UUID**.
 * Works in every runtime (browser / Node / Deno) because it is just
 * string validation – no crypto required.
 */
export function isUuidV4(str: string): boolean {
  return V4_REGEX.test(str)
}

const V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Generate a **version‑4 UUID** (random).
 *
 * • Uses the native `crypto.randomUUID()` when available (all modern
 *   browsers, Deno, Node ≥ 16.9).
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
export function uuidV4(): string {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID()
  }

  const bytes = getRandomBytes(16) as Uint8Array
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function getRandomBytes(len: number): Uint8Array {
  // Browser / Deno
  if (typeof crypto?.getRandomValues === "function") {
    return crypto.getRandomValues(new Uint8Array(len))
  }

  // Node.js
  if (typeof require === "function") {
    try {
      const { randomBytes } = require("crypto") as typeof import("crypto")
      const buf = randomBytes(len) as Buffer
      return Uint8Array.from(buf)
    } catch {
      // ignore
    }
  }

  // Fallback
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}
