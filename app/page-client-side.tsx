"use client"

import EntityTable from "../components/entity-table/components/entity-table"
import PDFContainer from "../components/pdf-container/pdf-container-dynamic"

// import PluginStoreTable from "../components/plugin-store/components/plugin-store-table"

export default function ClientSideHomePage() {
  return (
    <div className="flex flex-row h-screen w-full gap-4 p-4">
      {/* <PluginStoreTable /> */}
      <div className="flex-1 h-full">
        <PDFContainer url="https://raw.githubusercontent.com/optimalcharb/pdf-entity-labeling/cdc90a5392c72982e80c9bf08e330d7b05d29c5d/public/example-pdfs/federal-register/2025-19982_first_page.pdf" />
      </div>
      <div className="w-1/3 min-w-[300px] h-full overflow-auto">
        <EntityTable />
      </div>
    </div>
  )
}
