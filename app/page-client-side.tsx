"use client"

import EntityTable from "../components/entity-table/components/entity-table"
import PDFContainer from "../components/pdf-container/pdf-container-dynamic"

// import PluginStoreTable from "../components/plugin-store/components/plugin-store-table"

export default function ClientSideHomePage() {
  return (
    <div className="flex flex-row h-screen w-full gap-4 p-4">
      {/* <PluginStoreTable /> */}
      <div className="flex-1 h-full">
        <PDFContainer url="https://snippet.embedpdf.com/ebook.pdf" />
      </div>
      <div className="w-1/3 min-w-[300px] h-full overflow-auto">
        <EntityTable />
      </div>
    </div>
  )
}
