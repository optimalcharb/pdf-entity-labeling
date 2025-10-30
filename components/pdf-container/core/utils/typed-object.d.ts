type EnumKey = string | number

/**
 * Iterate over a Record whose keys are enum members (numeric or string),
 * getting back a fully-typed `[key, value]` tuple array.
 *
 * Usage:
 *   for (const [subtype, defaults] of enumEntries(this.state.toolDefaults)) {
 *     // subtype is inferred as keyof ToolDefaultsBySubtype
 *   }
 */
export declare function enumEntries<E extends EnumKey, V>(record: Record<E, V>): Array<[E, V]>
