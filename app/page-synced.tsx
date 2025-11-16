"use client"

import ActiveToolTable from "../components/active-tool-table"
import PDFContainer from "../components/pdf-container/pdf-container-dynamic"

export default function HomePageSynced() {
  return (
    <div className="space-y-4">
      <ActiveToolTable />
      <PDFContainer url="https://snippet.embedpdf.com/ebook.pdf" />
    </div>
  )
}
