"use client"

import PDFContainer from "../components/pdf-container/pdf-container-dynamic"
import PluginStoreTable from "../components/plugin-store/components/plugin-store-table"

export default function ClientSideHomePage() {
  return (
    <div className="space-y-4">
      <PluginStoreTable />
      <PDFContainer url="https://snippet.embedpdf.com/ebook.pdf" />
    </div>
  )
}
