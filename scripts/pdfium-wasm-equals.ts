import { createHash } from "crypto"
import "dotenv/config"
import fs from "fs/promises"
import path from "path"

/**
 * Compute a SHA-256 hash of an ArrayBuffer or Buffer
 */
async function hashBuffer(buffer: ArrayBuffer | Buffer): Promise<string> {
  const hash = createHash("sha256")
  hash.update(buffer)
  return hash.digest("hex")
}

/**
 * Compare the locally served .wasm (via dev server) and the one from node_modules
 */
async function compareWasm(): Promise<void> {
  const localPath = path.resolve(process.cwd(), "public/engines/pdfium.wasm")
  const npmPath = path.resolve(process.cwd(), "node_modules/@embedpdf/pdfium/dist/pdfium.wasm")

  console.log("Comparing WASM binaries...\n")

  const [localBuffer, npmBuffer] = await Promise.all([fs.readFile(localPath), fs.readFile(npmPath)])

  // Compute and compare hashes
  const localHash = await hashBuffer(localBuffer)
  const npmHash = await hashBuffer(npmBuffer)

  console.log(`Local:     ${localHash}`)
  console.log(`npm: ${npmHash}\n`)

  if (localHash === npmHash) {
    console.log("✅ The two WASM files are identical.")
  } else {
    console.log("❌ The two WASM files differ.")
  }
}

compareWasm().catch((err) => {
  console.error("Error comparing wasm files:", err)
  process.exit(1)
})
