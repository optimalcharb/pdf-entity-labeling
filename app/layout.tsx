import type { Metadata, Viewport } from "next"
import { Manrope } from "next/font/google"
import "./globals.css"

export const metadata: Metadata = {
  title: "PDF Entity Labeling",
  description: "Open source components for labeling entities in PDFs",
}

export const viewport: Viewport = {
  maximumScale: 1,
}

const manrope = Manrope({ subsets: ["latin"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`bg-white text-black dark:bg-gray-950 dark:text-white ${manrope.className}`}
    >
      <body className="min-h-[100dvh] bg-gray-50">{children}</body>
    </html>
  )
}
