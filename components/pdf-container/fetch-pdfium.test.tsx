import { describe, expect, test } from "bun:test"
import { createHash } from "crypto"
import fs from "fs/promises"
import path from "path"

// Mock the env import for tests - in a real app this would come from env.mjs
const mockBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

// Compute a SHA-256 hash of an ArrayBuffer or Buffer
async function hashBuffer(buffer: ArrayBuffer | Buffer): Promise<string> {
  const hash = createHash("sha256")
  if (buffer instanceof ArrayBuffer) {
    hash.update(Buffer.from(buffer))
  } else {
    hash.update(buffer)
  }
  return hash.digest("hex")
}

describe("PDFium WASM", () => {
  // Skip this test unless npm run dev is running
  test.skip("fetch pdfium.wasm from dev server", async () => {
    const baseUrl = mockBaseUrl
    const response = await fetch(`${baseUrl}/engines/pdfium.wasm`)

    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("application/wasm")
  })

  test("local and npm PDFium WASM should be equal", async () => {
    const localPath = path.resolve(process.cwd(), "public/engines/pdfium.wasm")
    const npmPath = path.resolve(process.cwd(), "node_modules/@embedpdf/pdfium/dist/pdfium.wasm")

    const [localBuffer, npmBuffer] = await Promise.all([
      fs.readFile(localPath),
      fs.readFile(npmPath),
    ])

    // Compute and compare hashes
    const localHash = await hashBuffer(localBuffer)
    const npmHash = await hashBuffer(npmBuffer)

    expect(localHash).toBe(npmHash)
  })
})
