"use client"

import useAnnotationStore from "@/hooks/annotation-store/use-annotation-store"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./shadcn-ui/table"

/**
 * This component demonstrates using the synced Zustand store
 * from OUTSIDE the EmbedPDF component tree.
 *
 * It does NOT use the annotation plugin directly, but reads from
 * the Zustand store which is synced by SyncWrapper inside PDFContainer.
 */
export default function ActiveToolTable() {
  const { activeToolId, selectedUid, canUndo, canRedo } = useAnnotationStore()

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Annotation State (via Zustand)</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Property</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Active Tool ID</TableCell>
            <TableCell>
              <span className="rounded bg-blue-100 px-2 py-1 font-mono text-sm">
                {activeToolId ?? "null"}
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Selected UID</TableCell>
            <TableCell>
              <span className="rounded bg-purple-100 px-2 py-1 font-mono text-sm">
                {selectedUid ?? "null"}
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Can Undo</TableCell>
            <TableCell>
              <span
                className={`rounded px-2 py-1 font-mono text-sm ${
                  canUndo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {canUndo.toString()}
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Can Redo</TableCell>
            <TableCell>
              <span
                className={`rounded px-2 py-1 font-mono text-sm ${
                  canRedo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {canRedo.toString()}
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
