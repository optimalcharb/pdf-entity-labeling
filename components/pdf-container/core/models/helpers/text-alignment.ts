import { PdfTextAlignment } from '../pdf';

/** Extra UI sentinel for “mixed values”. */
export const MixedTextAlignment = Symbol('mixed');
export type UiTextAlignmentValue = PdfTextAlignment | typeof MixedTextAlignment;

export type CssTextAlign = 'left' | 'center' | 'right';

interface TextAlignmentInfo {
  id: PdfTextAlignment;
  label: string;
  css: CssTextAlign;
}

const TEXT_ALIGNMENT_INFOS: readonly TextAlignmentInfo[] = Object.freeze([
  { id: PdfTextAlignment.Left, label: 'Left', css: 'left' },
  { id: PdfTextAlignment.Center, label: 'Center', css: 'center' },
  { id: PdfTextAlignment.Right, label: 'Right', css: 'right' },
]);

/* Build O(1) maps */
const enumToTextInfo: Record<PdfTextAlignment, TextAlignmentInfo> = TEXT_ALIGNMENT_INFOS.reduce(
  (m, info) => {
    m[info.id] = info;
    return m;
  },
  {} as Record<PdfTextAlignment, TextAlignmentInfo>,
);

const cssToTextEnum = TEXT_ALIGNMENT_INFOS.reduce<Record<CssTextAlign, PdfTextAlignment>>(
  (m, info) => {
    m[info.css] = info.id;
    return m;
  },
  {} as Record<CssTextAlign, PdfTextAlignment>,
);

/** Get descriptor (falls back to Left if unknown). */
export function getTextAlignmentInfo(alignment: PdfTextAlignment): TextAlignmentInfo {
  return enumToTextInfo[alignment] ?? enumToTextInfo[PdfTextAlignment.Left];
}

export function textAlignmentToCss(alignment: PdfTextAlignment): CssTextAlign {
  return getTextAlignmentInfo(alignment).css;
}

export function cssToTextAlignment(value: CssTextAlign): PdfTextAlignment | undefined {
  return cssToTextEnum[value];
}

export function textAlignmentLabel(alignment: PdfTextAlignment): string {
  return getTextAlignmentInfo(alignment).label;
}

export function reduceTextAlignments(values: readonly PdfTextAlignment[]): UiTextAlignmentValue {
  if (!values.length) return PdfTextAlignment.Left;
  const first = values[0];
  return values.every((a) => a === first) ? first : MixedTextAlignment;
}

export const textAlignmentSelectOptions = TEXT_ALIGNMENT_INFOS.map((info) => ({
  value: info.id,
  label: info.label,
}));
