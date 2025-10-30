import { Position, Rect, Rotation, Size } from "./geometry"
import { Task, TaskError } from "./task"
export interface PdfPageObject {
  index: number
  size: Size
}
export interface PdfPageObjectWithRotatedSize extends PdfPageObject {
  rotatedSize: Size
}
export interface PdfDocumentObject {
  id: string
  name?: string
  pageCount: number
  pages: PdfPageObject[]
}
export interface PdfMetadataObject {
  title: string | null
  author: string | null
  creationDate: Date | null
  trapped: PdfTrappedStatus | null
}
export declare enum PdfBlendMode {
  Normal = 0,
  Multiply = 1,
  Screen = 2,
  Overlay = 3,
  Darken = 4,
  Lighten = 5,
  ColorDodge = 6,
  ColorBurn = 7,
  HardLight = 8,
  SoftLight = 9,
  Difference = 10,
  Exclusion = 11,
  Hue = 12,
  Saturation = 13,
  Color = 14,
  Luminosity = 15,
}
export declare enum PdfZoomMode {
  Unknown = 0,
  /**
   * Zoom level with specified offset.
   */
  XYZ = 1,
  /**
   * Fit both the width and height of the page (whichever smaller).
   */
  FitPage = 2,
  /**
   * Fit the entire page width to the window.
   */
  FitHorizontal = 3,
  /**
   * Fit the entire page height to the window.
   */
  FitVertical = 4,
  /**
   * Fit a specific rectangle area within the window.
   */
  FitRectangle = 5,
  /**
   * Fit bounding box of the entire page (including annotations).
   */
  FitBoundingBox = 6,
  /**
   * Fit the bounding box width of the page.
   */
  FitBoundingBoxHorizontal = 7,
  /**
   * Fit the bounding box height of the page.
   */
  FitBoundingBoxVertical = 8,
}
export declare enum PdfTrappedStatus {
  NotSet = 0,
  True = 1,
  False = 2,
  Unknown = 3,
}
export interface PdfDestinationObject {
  pageIndex: number
  zoom:
    | {
        mode: PdfZoomMode.Unknown
      }
    | {
        mode: PdfZoomMode.XYZ
        params: {
          x: number
          y: number
          zoom: number
        }
      }
    | {
        mode: PdfZoomMode.FitPage
      }
    | {
        mode: PdfZoomMode.FitHorizontal
      }
    | {
        mode: PdfZoomMode.FitVertical
      }
    | {
        mode: PdfZoomMode.FitRectangle
      }
    | {
        mode: PdfZoomMode.FitBoundingBox
      }
    | {
        mode: PdfZoomMode.FitBoundingBoxHorizontal
      }
    | {
        mode: PdfZoomMode.FitBoundingBoxVertical
      }
  view: number[]
}
export declare enum PdfActionType {
  Unsupported = 0,
  /**
   * Goto specified position in this document
   */
  Goto = 1,
  /**
   * Goto specified position in another document
   */
  RemoteGoto = 2,
  /**
   * Goto specified URI
   */
  URI = 3,
  /**
   * Launch specifed application
   */
  LaunchAppOrOpenFile = 4,
}
export type PdfImage = {
  data: Uint8ClampedArray<ArrayBuffer>
  width: number
  height: number
}
export type PdfActionObject =
  | {
      type: PdfActionType.Unsupported
    }
  | {
      type: PdfActionType.Goto
      destination: PdfDestinationObject
    }
  | {
      type: PdfActionType.RemoteGoto
      destination: PdfDestinationObject
    }
  | {
      type: PdfActionType.URI
      uri: string
    }
  | {
      type: PdfActionType.LaunchAppOrOpenFile
      path: string
    }
export type PdfLinkTarget =
  | {
      type: "action"
      action: PdfActionObject
    }
  | {
      type: "destination"
      destination: PdfDestinationObject
    }
export interface PdfBookmarkObject {
  title: string
  target?: PdfLinkTarget | undefined
  children?: PdfBookmarkObject[]
}
export interface PdfBookmarksObject {
  bookmarks: PdfBookmarkObject[]
}
export interface PdfAlphaColor {
  red: number
  green: number
  blue: number
  alpha: number
}
export interface PdfColor {
  red: number
  green: number
  blue: number
}
export declare enum PdfPageObjectType {
  UNKNOWN = 0,
  TEXT = 1,
  PATH = 2,
  IMAGE = 3,
  SHADING = 4,
  FORM = 5,
}
/**
 * Matrix for transformation, in the form [a b c d e f], equivalent to:
 * | a  b  0 |
 * | c  d  0 |
 * | e  f  1 |
 *
 * Translation is performed with [1 0 0 1 tx ty].
 * Scaling is performed with [sx 0 0 sy 0 0].
 * See PDF Reference 1.7, 4.2.2 Common Transformations for more.
 */
export interface PdfTransformMatrix {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}
export declare enum PdfSegmentObjectType {
  UNKNOWN = -1,
  LINETO = 0,
  BEZIERTO = 1,
  MOVETO = 2,
}
export interface PdfSegmentObject {
  type: PdfSegmentObjectType
  point: Position
  isClosed: boolean
}
export interface PdfPathObject {
  type: PdfPageObjectType.PATH
  bounds: {
    left: number
    bottom: number
    right: number
    top: number
  }
  segments: PdfSegmentObject[]
  matrix: PdfTransformMatrix
}
export declare enum PdfEngineFeature {
  RenderPage = 0,
  RenderPageRect = 1,
  Thumbnails = 2,
  Bookmarks = 3,
  Annotations = 4,
}
export declare enum PdfEngineOperation {
  Create = 0,
  Read = 1,
  Update = 2,
  Delete = 3,
}
export type ImageConversionTypes = "image/webp" | "image/png" | "image/jpeg"

export interface SearchTarget {
  keyword: string
  flags: MatchFlag[]
}
/**
 * compare 2 search target
 * @param targetA - first target for search
 * @param targetB - second target for search
 * @returns whether 2 search target are the same
 *
 * @public
 */
export declare function compareSearchTarget(targetA: SearchTarget, targetB: SearchTarget): boolean

export interface PageTextSlice {
  pageIndex: number
  charIndex: number
  charCount: number
}
export interface PdfGlyphObject {
  origin: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
  isSpace?: boolean
  isEmpty?: boolean
}
export interface PdfGlyphSlim {
  x: number
  y: number
  width: number
  height: number
  flags: number
}
export interface PdfRun {
  rect: {
    x: number
    y: number
    width: number
    height: number
  }
  charStart: number
  glyphs: PdfGlyphSlim[]
}
export interface PdfPageGeometry {
  runs: PdfRun[]
}
export type PdfFileContent = ArrayBuffer
export interface PdfFileWithoutContent {
  id: string
  name?: string
}
export interface PdfFileLoader extends PdfFileWithoutContent {
  fileLength: number
  /**
   * read block of file
   * @param offset - offset of file
   * @param length - length of file
   * @returns block of file
   */
  callback: (offset: number, length: number) => Uint8Array
}
export interface PdfFile extends PdfFileWithoutContent {
  content: PdfFileContent
}
export interface PdfFileUrl extends PdfFileWithoutContent {
  url: string
}
export declare enum PdfErrorCode {
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
export interface PdfErrorReason {
  code: PdfErrorCode
  message: string
}
export type PdfEngineError = TaskError<PdfErrorReason>
export type PdfTask<R, P = unknown> = Task<R, PdfErrorReason, P>
export declare class PdfTaskHelper {
  static create<R, P = unknown>(): Task<R, PdfErrorReason, P>
  static resolve<R, P = unknown>(result: R): Task<R, PdfErrorReason, P>
  static reject<T = any, P = unknown>(reason: PdfErrorReason): Task<T, PdfErrorReason, P>
  static abort<T = any, P = unknown>(reason: PdfErrorReason): Task<T, PdfErrorReason, P>
}
export interface PdfOpenDocumentBufferOptions {
  password?: string
}
export interface PdfOpenDocumentUrlOptions {
  password?: string
  mode?: "auto" | "range-request" | "full-fetch"
}
export interface PdfRenderOptions {
  scaleFactor?: number
  rotation?: Rotation
  // Device pixel ratio
  dpr?: number
  imageType?: ImageConversionTypes
  // Image quality (0-1) for jpeg and png
  imageQuality?: number
}
export interface ConvertToBlobOptions {
  type: ImageConversionTypes
  quality?: number
}
export interface PdfRenderPageOptions extends PdfRenderOptions {
  withAnnotations?: boolean
}
export interface PdfEngine<T = Blob> {
  /**
   * Check whether pdf engine supports this feature
   * @param feature - which feature want to check
   * @returns support or not
   */
  isSupport?: (feature: PdfEngineFeature) => PdfTask<PdfEngineOperation[]>
  /**
   * Initialize the engine
   * @returns task that indicate whether initialization is successful
   */
  initialize?: () => PdfTask<boolean>
  /**
   * Destroy the engine
   * @returns task that indicate whether destroy is successful
   */
  destroy?: () => PdfTask<boolean>
  /**
   * Open a PDF from a URL with specified mode
   * @param url - The PDF file URL
   * @param options - Additional options including mode (auto, range-request, full-fetch) and password
   * @returns Task that resolves with the PdfDocumentObject or an error
   */
  openDocumentUrl: (
    file: PdfFileUrl,
    options?: PdfOpenDocumentUrlOptions,
  ) => PdfTask<PdfDocumentObject>
  /**
   * Open pdf document from buffer
   * @param file - pdf file
   * @param options - Additional options including password
   * @returns task that contains the file or error
   */
  openDocumentBuffer: (
    file: PdfFile,
    options?: PdfOpenDocumentBufferOptions,
  ) => PdfTask<PdfDocumentObject>
  /**
   * Get the metadata of the file
   * @param doc - pdf document
   * @returns task that contains the metadata or error
   */
  getMetadata: (doc: PdfDocumentObject) => PdfTask<PdfMetadataObject>
  /**
   * Set the metadata of the file
   * @param doc - pdf document
   * @param metadata - metadata to set
   * @returns task that contains the metadata or error
   */
  setMetadata: (doc: PdfDocumentObject, metadata: Partial<PdfMetadataObject>) => PdfTask<boolean>
  /**
   * Get permissions of the file
   * @param doc - pdf document
   * @returns task that contains a 32-bit integer indicating permission flags
   */
  getDocPermissions: (doc: PdfDocumentObject) => PdfTask<number>
  /**
   * Get the user permissions of the file
   * @param doc - pdf document
   * @returns task that contains a 32-bit integer indicating permission flags
   */
  getDocUserPermissions: (doc: PdfDocumentObject) => PdfTask<number>
  /**
   * Get the signatures of the file
   * @param doc - pdf document
   * @returns task that contains the signatures or error
   */
  getSignatures: (doc: PdfDocumentObject) => PdfTask<PdfSignatureObject[]>
  /**
   * Get the bookmarks of the file
   * @param doc - pdf document
   * @returns task that contains the bookmarks or error
   */
  getBookmarks: (doc: PdfDocumentObject) => PdfTask<PdfBookmarksObject>
  /**
   * Set the bookmarks of the file
   * @param doc - pdf document
   * @param payload - bookmarks to set
   * @returns task that contains whether the bookmarks are set successfully or not
   */
  setBookmarks: (doc: PdfDocumentObject, payload: PdfBookmarkObject[]) => PdfTask<boolean>
  /**
   * Remove all bookmarks from the document.
   * @param doc - pdf document
   * @returns task that contains whether the bookmarks are removed successfully or not
   */
  deleteBookmarks: (doc: PdfDocumentObject) => PdfTask<boolean>
  /**
   * Render the specified pdf page
   * @param doc - pdf document
   * @param page - pdf page
   * @param options - render options
   * @returns task contains the rendered image or error
   */
  renderPage: (
    doc: PdfDocumentObject,
    page: PdfPageObject,
    options?: PdfRenderPageOptions,
  ) => PdfTask<T>
  /**
   * Render the specified rect of pdf page
   * @param doc - pdf document
   * @param page - pdf page
   * @param rect - target rect
   * @param options - render options
   * @returns task contains the rendered image or error
   */
  renderPageRect: (
    doc: PdfDocumentObject,
    page: PdfPageObject,
    rect: Rect,
    options?: PdfRenderPageOptions,
  ) => PdfTask<T>
  /**
   * Render the thumbnail of specified pdf page
   * @param doc - pdf document
   * @param page - pdf page
   * @param options - render options
   * @returns task contains the rendered image or error
   */
  renderThumbnail: (
    doc: PdfDocumentObject,
    page: PdfPageObject,
    options?: PdfRenderThumbnailOptions,
  ) => PdfTask<T>
  /**
   * Render a single annotation into an ImageData blob.
   *
   * Note:  • honours Display-Matrix, page rotation & DPR
   *        • you decide whether to include the page background
   * @param doc - pdf document
   * @param page - pdf page
   * @param annotation - the annotation to render
   * @param options - render options
   */
  renderPageAnnotation(
    doc: PdfDocumentObject,
    page: PdfPageObject,
    annotation: PdfAnnotationObject,
    options?: PdfRenderPageAnnotationOptions,
  ): PdfTask<T>
  /**
   * Get annotations of pdf page
   * @param doc - pdf document
   * @param page - pdf page
   * @returns task contains the annotations or error
   */
  getPageAnnotations: (
    doc: PdfDocumentObject,
    page: PdfPageObject,
  ) => PdfTask<PdfAnnotationObject[]>
  /**
   * Create a annotation on specified page
   * @param doc - pdf document
   * @param page - pdf page
   * @param annotation - new annotations
   * @param context - context of the annotation
   * @returns task whether the annotations is created successfully
   */
  createPageAnnotation: <A extends PdfAnnotationObject>(
    doc: PdfDocumentObject,
    page: PdfPageObject,
    annotation: A,
    context?: AnnotationCreateContext<A>,
  ) => PdfTask<string>
  /**
   * Update a annotation on specified page
   * @param doc - pdf document
   * @param page - pdf page
   * @param annotation - new annotations
   * @returns task that indicates whether the operation succeeded
   */
  updatePageAnnotation: (
    doc: PdfDocumentObject,
    page: PdfPageObject,
    annotation: PdfAnnotationObject,
  ) => PdfTask<boolean>
  /**
   * Remove a annotation on specified page
   * @param doc - pdf document
   * @param page - pdf page
   * @param annotation - new annotations
   * @returns task whether the annotations is removed successfully
   */
  removePageAnnotation: (
    doc: PdfDocumentObject,
    page: PdfPageObject,
    annotation: PdfAnnotationObject,
  ) => PdfTask<boolean>
  /**
   * get all text rects in pdf page
   * @param doc - pdf document
   * @param page - pdf page
   * @param options - get page text rects options
   * @returns task contains the text rects or error
   */
  getPageTextRects: (doc: PdfDocumentObject, page: PdfPageObject) => PdfTask<PdfTextRectObject[]>
  /**
   * Search across all pages in the document
   * @param doc - pdf document
   * @param keyword - search keyword
   * @param options - search all pages options
   * @returns Task contains all search results throughout the document
   */
  searchAllPages: (
    doc: PdfDocumentObject,
    keyword: string,
    options?: PdfSearchAllPagesOptions,
  ) => PdfTask<SearchAllPagesResult, PdfPageSearchProgress>
  /**
   * Get all annotations in this file
   * @param doc - pdf document
   * @returns task that contains the annotations or error
   */
  getAllAnnotations: (
    doc: PdfDocumentObject,
  ) => PdfTask<Record<number, PdfAnnotationObject[]>, PdfAnnotationsProgress>
  /**
   * Get all attachments in this file
   * @param doc - pdf document
   * @returns task that contains the attachments or error
   */
  getAttachments: (doc: PdfDocumentObject) => PdfTask<PdfAttachmentObject[]>
  /**
   * Read content of pdf attachment
   * @param doc - pdf document
   * @param attachment - pdf attachments
   * @returns task that contains the content of specified attachment or error
   */
  readAttachmentContent: (
    doc: PdfDocumentObject,
    attachment: PdfAttachmentObject,
  ) => PdfTask<ArrayBuffer>
  /**
   * Set form field value
   * @param doc - pdf document
   * @param page - pdf page
   * @param annotation - pdf annotation
   * @param text - text value
   */
  setFormFieldValue: (
    doc: PdfDocumentObject,
    page: PdfPageObject,
    annotation: PdfWidgetAnnoObject,
    value: FormFieldValue,
  ) => PdfTask<boolean>
  /**
   * Flatten annotations and form fields into the page contents.
   * @param doc - pdf document
   * @param page - pdf page
   * @param options - flatten page options
   */
  flattenPage: (
    doc: PdfDocumentObject,
    page: PdfPageObject,
    options?: PdfFlattenPageOptions,
  ) => PdfTask<PdfPageFlattenResult>
  /**
   * Extract pdf pages to a new file
   * @param doc - pdf document
   * @param pageIndexes - indexes of pdf pages
   * @returns task contains the new pdf file content
   */
  extractPages: (doc: PdfDocumentObject, pageIndexes: number[]) => PdfTask<ArrayBuffer>
  /**
   * Extract text on specified pdf pages
   * @param doc - pdf document
   * @param pageIndexes - indexes of pdf pages
   * @returns task contains the text
   */
  extractText: (doc: PdfDocumentObject, pageIndexes: number[]) => PdfTask<string>
  /**
   * Redact text by run slices
   * @param doc - pdf document
   * @param page - pdf page
   * @param rects - rects to redact
   * @param options - redact text options
   * @returns task contains the result
   */
  redactTextInRects: (
    doc: PdfDocumentObject,
    page: PdfPageObject,
    rects: Rect[],
    options?: PdfRedactTextOptions,
  ) => PdfTask<boolean>
  /**
   * Extract text on specified pdf pages
   * @param doc - pdf document
   * @param pageIndexes - indexes of pdf pages
   * @returns task contains the text
   */
  getTextSlices: (doc: PdfDocumentObject, slices: PageTextSlice[]) => PdfTask<string[]>
  /**
   * Get all glyphs in the specified pdf page
   * @param doc - pdf document
   * @param page - pdf page
   * @returns task contains the glyphs
   */
  getPageGlyphs: (doc: PdfDocumentObject, page: PdfPageObject) => PdfTask<PdfGlyphObject[]>
  /**
   * Get the geometry of the specified pdf page
   * @param doc - pdf document
   * @param page - pdf page
   * @returns task contains the geometry
   */
  getPageGeometry: (doc: PdfDocumentObject, page: PdfPageObject) => PdfTask<PdfPageGeometry>
  /**
   * Merge multiple pdf documents
   * @param files - all the pdf files
   * @returns task contains the merged pdf file
   */
  merge: (files: PdfFile[]) => PdfTask<PdfFile>
  /**
   * Merge specific pages from multiple PDF documents in a custom order
   * @param mergeConfigs Array of configurations specifying which pages to merge from which documents
   * @returns A PdfTask that resolves with the merged PDF file
   * @public
   */
  mergePages: (
    mergeConfigs: Array<{
      docId: string
      pageIndices: number[]
    }>,
  ) => PdfTask<PdfFile>
  /**
   * Prepare a PDF document for printing
   * @param doc - pdf document
   * @param options - options for preparing the document for printing
   * @returns task contains the prepared pdf file content
   */
  preparePrintDocument: (doc: PdfDocumentObject, options?: PdfPrintOptions) => PdfTask<ArrayBuffer>
  /**
   * Save a copy of pdf document
   * @param doc - pdf document
   * @returns task contains the new pdf file content
   */
  saveAsCopy: (doc: PdfDocumentObject) => PdfTask<ArrayBuffer>
  /**
   * Close pdf document
   * @param doc - pdf document
   * @returns task that file is closed or not
   */
  closeDocument: (doc: PdfDocumentObject) => PdfTask<boolean>
  /**
   * Close all documents
   * @returns task that all documents are closed or not
   */
  closeAllDocuments: () => PdfTask<boolean>
}
export type PdfEngineMethodName = keyof Required<PdfEngine>
export type PdfEngineMethodArgs<P extends PdfEngineMethodName> = Readonly<
  Parameters<Required<PdfEngine>[P]>
>
export type PdfEngineMethodReturnType<P extends PdfEngineMethodName> = ReturnType<
  Required<PdfEngine>[P]
>
