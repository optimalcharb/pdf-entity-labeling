import { PdfAnnotationLineEnding, Position } from '@embedpdf/models';

/**
 * A handler that encapsulates all logic for a specific line ending type,
 * including SVG path generation, geometric vertex calculation, and rotation logic.
 * This is the single source of truth for each ending.
 */
export interface LineEndingHandler {
  /** Returns the SVG `d` attribute string for rendering. */
  getSvgPath: (strokeWidth: number) => string;
  /** Returns the vertices used for calculating the geometric bounding box. */
  getLocalPoints: (strokeWidth: number) => Position[];
  /** Returns the final rotation angle in radians based on the line segment's angle. */
  getRotation: (segmentAngle: number) => number;
  /** True if the shape should be filled, false if only stroked. */
  filled: boolean;
}

/**
 * Factory to create handlers for arrow-like shapes.
 * @param isClosed - If true, creates a closed (filled) arrowhead.
 */
function createArrowHandler(isClosed: boolean): LineEndingHandler {
  const calculateGeometry = (sw: number) => {
    const len = sw * 9;
    const a = Math.PI / 6; // 30 degrees
    return {
      x: -len * Math.cos(a),
      y: len * Math.sin(a),
    };
  };

  return {
    getSvgPath: (sw) => {
      const { x, y } = calculateGeometry(sw);
      return isClosed ? `M 0 0 L ${x} ${y} L ${x} ${-y} Z` : `M ${x} ${y} L 0 0 L ${x} ${-y}`;
    },
    getLocalPoints: (sw) => {
      const { x, y } = calculateGeometry(sw);
      return [
        { x: 0, y: 0 },
        { x, y },
        { x, y: -y },
      ];
    },
    getRotation: (segmentAngle) => segmentAngle,
    filled: isClosed,
  };
}

/**
 * Factory to create handlers for simple line-based shapes like Butt and Slash.
 * @param lengthFactor - Multiplier for strokeWidth to determine length.
 * @param rotationFn - Function to determine rotation from segment angle.
 */
function createLineHandler(
  lengthFactor: number,
  rotationFn: (angle: number) => number,
): LineEndingHandler {
  const getHalfLength = (sw: number) => (sw * lengthFactor) / 2;

  return {
    getSvgPath: (sw) => {
      const l = getHalfLength(sw);
      return `M ${-l} 0 L ${l} 0`;
    },
    getLocalPoints: (sw) => {
      const l = getHalfLength(sw);
      return [
        { x: -l, y: 0 },
        { x: l, y: 0 },
      ];
    },
    getRotation: rotationFn,
    filled: false,
  };
}

const OpenArrowHandler = createArrowHandler(false);
const ClosedArrowHandler = createArrowHandler(true);

/**
 * A map containing the authoritative handler for each line ending type.
 */
export const LINE_ENDING_HANDLERS: Partial<Record<PdfAnnotationLineEnding, LineEndingHandler>> = {
  [PdfAnnotationLineEnding.OpenArrow]: OpenArrowHandler,
  [PdfAnnotationLineEnding.ClosedArrow]: ClosedArrowHandler,
  [PdfAnnotationLineEnding.ROpenArrow]: {
    ...OpenArrowHandler,
    getRotation: (segmentAngle) => segmentAngle + Math.PI,
  },
  [PdfAnnotationLineEnding.RClosedArrow]: {
    ...ClosedArrowHandler,
    getRotation: (segmentAngle) => segmentAngle + Math.PI,
  },
  [PdfAnnotationLineEnding.Circle]: {
    getSvgPath: (sw) => {
      const r = (sw * 5) / 2;
      return `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0`;
    },
    getLocalPoints: (sw) => {
      const r = (sw * 5) / 2;
      return [
        { x: -r, y: -r },
        { x: r, y: r },
      ];
    },
    getRotation: () => 0,
    filled: true,
  },
  [PdfAnnotationLineEnding.Square]: {
    getSvgPath: (sw) => {
      const h = (sw * 6) / 2;
      return `M ${-h} ${-h} L ${h} ${-h} L ${h} ${h} L ${-h} ${h} Z`;
    },
    getLocalPoints: (sw) => {
      const h = (sw * 6) / 2;
      return [
        { x: -h, y: -h }, // TL
        { x: h, y: -h }, // TR
        { x: h, y: h }, // BR
        { x: -h, y: h }, // BL
      ];
    },
    getRotation: (segmentAngle) => segmentAngle, // keep your new orientation
    filled: true,
  },
  [PdfAnnotationLineEnding.Diamond]: {
    getSvgPath: (sw) => {
      const h = (sw * 6) / 2;
      return `M 0 ${-h} L ${h} 0 L 0 ${h} L ${-h} 0 Z`;
    },
    getLocalPoints: (sw) => {
      const h = (sw * 6) / 2;
      return [
        { x: 0, y: -h },
        { x: h, y: 0 },
        { x: 0, y: h },
        { x: -h, y: 0 },
      ];
    },
    getRotation: (segmentAngle) => segmentAngle,
    filled: true,
  },
  [PdfAnnotationLineEnding.Butt]: createLineHandler(6, (angle) => angle + Math.PI / 2),
  [PdfAnnotationLineEnding.Slash]: createLineHandler(18, (angle) => angle + Math.PI / 1.5),
};
