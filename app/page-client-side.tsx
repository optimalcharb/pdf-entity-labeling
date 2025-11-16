"use client"

import AnnotationStoreTable from "../components/annotation-store-table"
import PDFContainer from "../components/pdf-container/pdf-container-dynamic"

export default function ClientSideHomePage() {
  return (
    <div className="space-y-4">
      <AnnotationStoreTable />
      <PDFContainer url="https://snippet.embedpdf.com/ebook.pdf" />
    </div>
  )
}
