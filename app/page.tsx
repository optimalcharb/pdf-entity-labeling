import { PDFContainer } from "./pdf-container-dynamic"

export default function HomePage() {
  return (
    <main className="h-screen overflow-hidden">
      <PDFContainer url="https://snippet.embedpdf.com/ebook.pdf" />
    </main>
  )
}
