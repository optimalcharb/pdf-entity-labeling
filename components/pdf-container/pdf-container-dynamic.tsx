import dynamic from "next/dynamic"
import { Spinner } from "@/components/shadcn-ui/spinner"

// Dynamically import PDFContainer with no SSR and custom loading state
const PDFContainer = dynamic(() => import("@/components/pdf-container/pdf-container"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="text-center">
        <Spinner data-testid="spinner2" />
      </div>
    </div>
  ),
})
export default PDFContainer
