/* ------------------------------------------------------------------ */
/*  enumEntries – iterate over enum-keyed Records with strong typing  */
/* ------------------------------------------------------------------ */

type EnumKey = string | number;

/**
 * Iterate over a Record whose keys are enum members (numeric or string),
 * getting back a fully-typed `[key, value]` tuple array.
 *
 * Usage:
 *   for (const [subtype, defaults] of enumEntries(this.state.toolDefaults)) {
 *     // subtype is inferred as keyof ToolDefaultsBySubtype
 *   }
 */
export function enumEntries<E extends EnumKey, V>(record: Record<E, V>): Array<[E, V]> {
  // Tell TS the values are V (not unknown) *before* we map.
  return (Object.entries(record) as [string, V][]).map(([k, v]) => {
    // Numeric enums come out of Object.entries as "0", "1", …  → convert.
    const maybeNum = Number(k);
    const typedKey: E =
      Number.isFinite(maybeNum) && k.trim() !== '' // looks like a number?
        ? (maybeNum as unknown as E) // numeric enum key
        : (k as unknown as E); // string enum key

    return [typedKey, v]; // v is already typed as V
  });
}
