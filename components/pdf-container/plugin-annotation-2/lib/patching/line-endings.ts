import { PdfAnnotationLineEnding } from '@embedpdf/models';
import { LINE_ENDING_HANDLERS } from './line-ending-handlers';

export interface SvgEnding {
  d: string;
  transform: string;
  filled: boolean;
}

/**
 * Factory that returns SVG path data and transform attributes for a given line ending.
 * It uses a central handler for each ending type to ensure consistency.
 */
export function createEnding(
  ending: PdfAnnotationLineEnding | undefined,
  strokeWidth: number,
  rad: number, // direction angle in radians of the line segment
  px: number, // x-coordinate of the line's endpoint
  py: number, // y-coordinate of the line's endpoint
): SvgEnding | null {
  if (!ending) return null;

  const handler = LINE_ENDING_HANDLERS[ending];
  if (!handler) return null;

  const toDeg = (r: number) => (r * 180) / Math.PI;
  const rotationAngle = handler.getRotation(rad);

  return {
    d: handler.getSvgPath(strokeWidth),
    transform: `translate(${px} ${py}) rotate(${toDeg(rotationAngle)})`,
    filled: handler.filled,
  };
}
