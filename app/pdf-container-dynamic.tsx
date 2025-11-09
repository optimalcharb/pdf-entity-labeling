"use client"

import { Spinner } from "@/components/shadcn-ui/spinner"
import dynamic from "next/dynamic"

// Dynamically import PDFContainer with no SSR and custom loading state
export const PDFContainer = dynamic(() => import("@/components/pdf-container/pdf-container"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="text-center">
        <Spinner data-testid="spinner2" />
      </div>
    </div>
  ),
})
