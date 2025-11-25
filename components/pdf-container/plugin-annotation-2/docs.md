# Plugin Annotation 2

## Annotation Objects


Each PdfAnnotationSubtype from @embedpdf/models has an interface that extends PdfAnnotationObjectBase. PdfAnnotationObject is the union of all these interfaces.

```ts
interface PdfAnnotationObjectBase {
  id: string;
  type: PdfAnnotationSubtype;
  pageIndex: number;
  rect: Rect; // Rect is the bounding box of the annotation on the page
  author?: string;
  // Date is the JavaScript Date object
  modified?: Date;
  created?: Date;
  blendMode?: PdfBlendMode; // blendMode is used when mutliple highlights overlap
  intent?: string; // not using intent
  flags?: PdfAnnotationFlagName[]; // not using flags
  contents?: string; // for text markup annotations, contents is the text
  custom?: any; // not using custom
}
```

```ts
export interface PdfHighlightAnnoObject extends PdfAnnotationObjectBase {
  type: PdfAnnotationSubtype.HIGHLIGHT;
  contents?: string;
  color: string;
  opacity: number;
  /** 
   * text markup annotations have segmentRects, a list of bounding boxes of each character
   * rect prop of PdfAnnotationObjectBase is the bounding box of all the segmentRects
   */
  segmentRects: Rect[];
}
```

Text markup annotations are highlight, underline, strikeout, or squiggly as defined in [pdf-text-markup-annotation-object.d.ts](lib/pdf-text-markup-annotation-object.d.ts) They all have color, opacity, segmentRects, and their contents equals the text of the annotation.

Using PdfTextMarkupAnnotationObject type allows consumers to write patches that change the PdfAnnotationSubtype, color, opacity, or segmentRects of the annotation.

```ts
// Example patch
import { PdfAnnotationSubtype } from "@embedpdf/models"
import { PdfTextMarkupAnnotationObject } from "pdf-text-markup-annotation-object"
const patch: Partial<PdfTextMarkupAnnotationObject> = {
  type: PdfAnnotationSubtype.UNDERLINE,
  color: "#FF0000",
  opacity: 0.9
}
```
