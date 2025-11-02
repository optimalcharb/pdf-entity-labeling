/**
 * Restrict a numeric value to the inclusive range [min, max].
 *
 * @example
 *   clamp( 5, 0, 10)  // 5
 *   clamp(-3, 0, 10)  // 0
 *   clamp(17, 0, 10)  // 10
 */
export declare function clamp(value: number, min: number, max: number): number

/**
 * Deeply compares two values (objects, arrays, primitives)
 * with the following rules:
 *  - Objects are compared ignoring property order.
 *  - Arrays are compared ignoring element order (multiset comparison).
 *  - Primitives are compared by strict equality.
 *  - null/undefined are treated as normal primitives.
 *
 * @param a First value
 * @param b Second value
 * @param visited Used internally to detect cycles
 */
export declare function arePropsEqual(a: any, b: any, visited?: Set<any>): boolean
