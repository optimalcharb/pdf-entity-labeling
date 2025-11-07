/**
 * Restrict a numeric value to the inclusive range [min, max].
 *
 * @example
 *   clamp( 5, 0, 10)  // 5
 *   clamp(-3, 0, 10)  // 0
 *   clamp(17, 0, 10)  // 10
 */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

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
export function arePropsEqual(a: any, b: any, visited?: Set<any>): boolean {
  // Quick path for reference equality or same primitive
  if (a === b) {
    return true;
  }

  // Handle null/undefined mismatch
  if (a == null || b == null) {
    // If one is null/undefined and the other isn't, no match
    return a === b;
  }

  // Check types
  const aType = typeof a;
  const bType = typeof b;
  if (aType !== bType) return false;

  // If they are both objects or arrays, handle recursively
  if (aType === 'object') {
    // Optionally handle cyclical references
    if (!visited) visited = new Set();
    const pairId = getPairId(a, b);
    if (visited.has(pairId)) {
      // Already compared these two objects => assume true to avoid infinite recursion
      // or return false if you want to treat cycles as inequality
      return true;
    }
    visited.add(pairId);

    const aIsArray = Array.isArray(a);
    const bIsArray = Array.isArray(b);
    if (aIsArray && bIsArray) {
      // Compare as arrays ignoring order
      return arraysEqualUnordered(a, b, visited);
    } else if (!aIsArray && !bIsArray) {
      // Compare as plain objects (order of properties doesn't matter)
      return objectsEqual(a, b, visited);
    } else {
      // One is array, the other is object => not equal
      return false;
    }
  }

  // If both are function, symbol, etc. - typically we might say false
  // But you can decide your own logic for function or symbol equality
  return false;
}

function getPairId(a: any, b: any) {
  // Could do something more advanced. This is a cheap approach:
  // e.g. use the memory reference or an object identity approach
  return `${objectId(a)}__${objectId(b)}`;
}

/**
 * If you want stable object IDs, you'd need a WeakMap to store them.
 * This simplistic approach just calls toString on the object.
 */
let objectIdCounter = 0;
const objectIds = new WeakMap<object, number>();

function objectId(obj: object): number {
  if (!objectIds.has(obj)) {
    objectIds.set(obj, ++objectIdCounter);
  }
  return objectIds.get(obj)!;
}

function arraysEqualUnordered(a: any[], b: any[], visited?: Set<any>): boolean {
  if (a.length !== b.length) return false;

  const used = new Array<boolean>(b.length).fill(false);

  // For each element in a, find an unused matching element in b
  outer: for (let i = 0; i < a.length; i++) {
    const elemA = a[i];
    for (let j = 0; j < b.length; j++) {
      if (used[j]) continue; // already used that slot
      if (arePropsEqual(elemA, b[j], visited)) {
        used[j] = true;
        continue outer; // found match for a[i], proceed
      }
    }
    // If we never found a match
    return false;
  }

  return true;
}

function objectsEqual(a: object, b: object, visited?: Set<any>): boolean {
  // Get all prop keys
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;

  // Compare each property name
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
  }

  // Compare each property value
  for (const key of aKeys) {
    // @ts-ignore
    const valA = a[key];
    // @ts-ignore
    const valB = b[key];
    if (!arePropsEqual(valA, valB, visited)) {
      return false;
    }
  }
  return true;
}
