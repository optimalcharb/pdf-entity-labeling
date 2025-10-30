import { PDFContainer } from "./pdf-container-dynamic"

export default function HomePage() {
  return (
    <main className="py-20">
      <h1>PDF Container</h1>
      <PDFContainer url="https://snippet.embedpdf.com/ebook.pdf" />
    </main>
  )
}
