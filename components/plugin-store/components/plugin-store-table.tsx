"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../shadcn-ui/table"
import usePluginStore from "../hooks/use-plugin-store"

export default function PluginStoreTable() {
  const { annoCapability, annoState, selectCapability, scrollCapability } = usePluginStore()

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Plugin Store</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Property</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">annoCapability Active</TableCell>
            <TableCell>
              <span
                className={`rounded px-2 py-1 font-mono text-sm ${
                  annoCapability ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {annoCapability ? "Yes" : "No"}
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">selectCapability Active</TableCell>
            <TableCell>
              <span
                className={`rounded px-2 py-1 font-mono text-sm ${
                  selectCapability ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {selectCapability ? "Yes" : "No"}
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">scrollCapability Active</TableCell>
            <TableCell>
              <span
                className={`rounded px-2 py-1 font-mono text-sm ${
                  scrollCapability ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {scrollCapability ? "Yes" : "No"}
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Active Subtype</TableCell>
            <TableCell>
              <span className="rounded bg-blue-100 px-2 py-1 font-mono text-sm">
                {annoState?.activeSubtype ?? "null"}
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Selected UID</TableCell>
            <TableCell>
              <span className="rounded bg-purple-100 px-2 py-1 font-mono text-sm">
                {annoState?.selectedUid ?? "null"}
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Can Undo</TableCell>
            <TableCell>
              <span
                className={`rounded px-2 py-1 font-mono text-sm ${
                  annoState?.canUndo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {annoState?.canUndo?.toString() ?? "false"}
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Can Redo</TableCell>
            <TableCell>
              <span
                className={`rounded px-2 py-1 font-mono text-sm ${
                  annoState?.canRedo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {annoState?.canRedo?.toString() ?? "false"}
              </span>
            </TableCell>
          </TableRow>
          {/* <TableRow>
            <TableCell className="font-medium">byUid</TableCell>
            <TableCell>
              <span
                className={`rounded px-2 py-1 font-mono text-sm ${
                  annoState?.byUid ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                <pre>{JSON.stringify(annoState?.byUid, null, 2)}</pre>
              </span>
            </TableCell>
          </TableRow> */}
        </TableBody>
      </Table>

      <div className="mt-4">
        <button
          onClick={() => annoCapability?.deselectAnnotation()}
          disabled={!annoCapability}
          className="rounded bg-gray-100 px-3 py-1 text-sm font-medium hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Test: Deselect All
        </button>
      </div>
    </div>
  )
}
