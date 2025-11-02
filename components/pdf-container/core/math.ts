/**
 * Restrict a numeric value to the inclusive range [min, max].
 *
 * @example
 *   clamp( 5, 0, 10)  // 5
 *   clamp(-3, 0, 10)  // 0
 *   clamp(17, 0, 10)  // 10
 */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
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
  if (a === b) {
    return true
  }
  if (a == null || b == null) {
    return a === b
  }
  const aType = typeof a
  const bType = typeof b
  if (aType !== bType) return false
  if (aType === "object") {
    if (!visited) visited = /* @__PURE__ */ new Set()
    const pairId = getPairId(a, b)
    if (visited.has(pairId)) {
      return true
    }
    visited.add(pairId)
    const aIsArray = Array.isArray(a)
    const bIsArray = Array.isArray(b)
    if (aIsArray && bIsArray) {
      return arraysEqualUnordered(a, b, visited)
    } else if (!aIsArray && !bIsArray) {
      return objectsEqual(a, b, visited)
    } else {
      return false
    }
  }
  return false
}

function getPairId(a: any, b: any): string {
  return `${objectId(a)}__${objectId(b)}`
}

let objectIdCounter = 0
const objectIds = /* @__PURE__ */ new WeakMap<object, number>()
function objectId(obj: object): number {
  if (!objectIds.has(obj)) {
    objectIds.set(obj, ++objectIdCounter)
  }
  return objectIds.get(obj)!
}

function arraysEqualUnordered(a: any[], b: any[], visited: Set<any>): boolean {
  if (a.length !== b.length) return false
  const used = new Array(b.length).fill(false)
  outer: for (let i = 0; i < a.length; i++) {
    const elemA = a[i]
    for (let j = 0; j < b.length; j++) {
      if (used[j]) continue
      if (arePropsEqual(elemA, b[j], visited)) {
        used[j] = true
        continue outer
      }
    }
    return false
  }
  return true
}

function objectsEqual(a: object, b: object, visited: Set<any>): boolean {
  const aKeys = Object.keys(a).sort()
  const bKeys = Object.keys(b).sort()
  if (aKeys.length !== bKeys.length) return false
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false
  }
  for (const key of aKeys) {
    const valA = (a as any)[key]
    const valB = (b as any)[key]
    if (!arePropsEqual(valA, valB, visited)) {
      return false
    }
  }
  return true
}
