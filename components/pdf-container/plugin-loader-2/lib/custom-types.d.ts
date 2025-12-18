export interface LoaderEvent {
  type: "start" | "complete" | "error"
  documentId?: string
  error?: Error
}
