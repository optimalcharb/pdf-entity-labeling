import { useMemo, MouseEvent, TouchEvent } from 'react';
import { PdfAnnotationBorderStyle, Rect } from '@embedpdf/models';

/* ---------------------------------------------------------------- *\
|* Types                                                            *|
\* ---------------------------------------------------------------- */

interface CircleProps {
  /** Whether the annotation is selected */
  isSelected: boolean;
  /** Fill colour – defaults to PDFium’s black if omitted */
  color?: string;
  /** Stroke colour – defaults to same as fill when omitted */
  strokeColor?: string;
  /** 0 – 1 */
  opacity?: number;
  /** Stroke width in PDF units */
  strokeWidth: number;
  /** Stroke type – defaults to solid when omitted */
  strokeStyle?: PdfAnnotationBorderStyle;
  /** Stroke dash array – defaults to undefined when omitted */
  strokeDashArray?: number[];
  /** Bounding box of the annotation */
  rect: Rect;
  /** Current page zoom factor */
  scale: number;
  /** Click handler (used for selection) */
  onClick?: (e: MouseEvent<SVGElement> | TouchEvent<SVGElement>) => void;
}

/**
 * Renders a PDF Circle annotation (ellipse) as SVG.
 */
export function Circle({
  color = '#000000',
  strokeColor,
  opacity = 1,
  strokeWidth,
  strokeStyle = PdfAnnotationBorderStyle.SOLID,
  strokeDashArray,
  rect,
  scale,
  onClick,
  isSelected,
}: CircleProps): JSX.Element {
  /* ------------------------------------------------------------------ */
  /* geometry helpers                                                   */
  /* ------------------------------------------------------------------ */
  const { width, height, cx, cy, rx, ry } = useMemo(() => {
    // Full bounding box *includes* stroke width.
    const outerW = rect.size.width;
    const outerH = rect.size.height;

    // Remove the stroke so the visible fill matches the preview.
    const innerW = Math.max(outerW - strokeWidth, 0);
    const innerH = Math.max(outerH - strokeWidth, 0);

    return {
      width: outerW,
      height: outerH,
      // Centre of the fill sits strokeWidth/2 in from the edges
      cx: strokeWidth / 2 + innerW / 2,
      cy: strokeWidth / 2 + innerH / 2,
      rx: innerW / 2,
      ry: innerH / 2,
    };
  }, [rect, strokeWidth]);

  const svgWidth = width * scale;
  const svgHeight = height * scale;

  return (
    <svg
      style={{
        position: 'absolute',
        width: svgWidth,
        height: svgHeight,
        pointerEvents: 'none',
        zIndex: 2,
      }}
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${width} ${height}`}
    >
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={color}
        opacity={opacity}
        onPointerDown={onClick}
        onTouchStart={onClick}
        style={{
          cursor: isSelected ? 'move' : 'pointer',
          pointerEvents: isSelected
            ? 'none'
            : color === 'transparent'
              ? 'visibleStroke'
              : 'visible',
          stroke: strokeColor ?? color,
          strokeWidth,
          ...(strokeStyle === PdfAnnotationBorderStyle.DASHED && {
            strokeDasharray: strokeDashArray?.join(','),
          }),
        }}
      />
    </svg>
  );
}
