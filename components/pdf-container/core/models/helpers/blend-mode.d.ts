import { PdfBlendMode } from "../pdf"
/** Extra UI sentinel for “multiple different values selected”. */
export declare const MixedBlendMode: unique symbol
export type UiBlendModeValue = PdfBlendMode | typeof MixedBlendMode
export type CssBlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity"
interface BlendModeInfo {
  /** Pdf enum value */
  id: PdfBlendMode
  /** Human label for UI */
  label: string
  /** CSS mix-blend-mode token */
  css: CssBlendMode
}
/** Get descriptor (falls back to Normal if unknown number sneaks in).
 *
 * @public
 */
export declare function getBlendModeInfo(mode: PdfBlendMode): BlendModeInfo
/** Convert enum → CSS value for `mix-blend-mode`.
 *
 * @public
 */
export declare function blendModeToCss(mode: PdfBlendMode): CssBlendMode
/** Convert CSS token → enum (returns undefined if not recognized).
 *
 * @public
 */
export declare function cssToBlendMode(value: CssBlendMode): PdfBlendMode | undefined
/** Enum → UI label.
 *
 * @public
 */
export declare function blendModeLabel(mode: PdfBlendMode): string
/**
 * For a selection of annotations: returns the common enum value, or Mixed sentinel.
 *
 * @public
 */
export declare function reduceBlendModes(modes: readonly PdfBlendMode[]): UiBlendModeValue
/** Options for a <select>.
 *
 * @public
 */
export declare const blendModeSelectOptions: {
  value: PdfBlendMode
  label: string
}[]
/** Provide a label when Mixed sentinel used (UI convenience).
 *
 * @public
 */
export declare function uiBlendModeDisplay(value: UiBlendModeValue): string
export {}
