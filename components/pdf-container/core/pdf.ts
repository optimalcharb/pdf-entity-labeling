export enum PdfTrappedStatus {
  NotSet = 0,
  True = 1,
  False = 2,
  Unknown = 3,
}
export enum PdfEngineFeature {
  RenderPage = 0,
  RenderPageRect = 1,
  Thumbnails = 2,
  Bookmarks = 3,
  Annotations = 4,
}
export enum PdfEngineOperation {
  Create = 0,
  Read = 1,
  Update = 2,
  Delete = 3,
}
export enum PdfErrorCode {
  Ok = 0, //  #define FPDF_ERR_SUCCESS 0    // No error.
  Unknown = 1, // #define FPDF_ERR_UNKNOWN 1    // Unknown error.
  NotFound = 2, // #define FPDF_ERR_FILE 2       // File not found or could not be opened.
  WrongFormat = 3, // #define FPDF_ERR_FORMAT 3     // File not in PDF format or corrupted.
  Password = 4, // #define FPDF_ERR_PASSWORD 4   // Password required or incorrect password.
  Security = 5, // #define FPDF_ERR_SECURITY 5   // Unsupported security scheme.
  PageError = 6, // #define FPDF_ERR_PAGE 6       // Page not found or content error.
  XFALoad = 7, // #ifdef PDF_ENABLE_XFA
  XFALayout = 8, //
  Cancelled = 9,
  Initialization = 10,
  NotReady = 11,
  NotSupport = 12,
  LoadDoc = 13,
  DocNotOpen = 14,
  CantCloseDoc = 15,
  CantCreateNewDoc = 16,
  CantImportPages = 17,
  CantCreateAnnot = 18,
  CantSetAnnotRect = 19,
  CantSetAnnotContent = 20,
  CantRemoveInkList = 21,
  CantAddInkStoke = 22,
  CantReadAttachmentSize = 23,
  CantReadAttachmentContent = 24,
  CantFocusAnnot = 25,
  CantSelectText = 26,
  CantSelectOption = 27,
  CantCheckField = 28,
  CantSetAnnotString = 29,
}
