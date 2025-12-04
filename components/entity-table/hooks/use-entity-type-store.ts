// import { PdfAnnotationSubtype } from "@embedpdf/models"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { EntityType } from "../entity-type"

// define state initial values and types
const initialState = {
  byName: {} as Record<string, EntityType>,
}

// define state actions
type EntityTypeStore = typeof initialState & {
  setByName: (byName: Record<string, EntityType>) => void
  patchEntityType: (name: string, patch: Partial<EntityType>) => void
  // fetchByName: () => Promise<void>
  reset: () => void
}

// create store
const useEntityTypeStore = create<EntityTypeStore>()(
  // persist in local storage on page refresh
  persist(
    (set) => ({
      ...initialState,
      setByName: (byName) => set({ byName }),

      patchEntityType: (name, patch) =>
        set((state) => {
          const entity = state.byName[name]
          if (!entity) return {}
          return {
            byName: {
              ...state.byName,
              [name]: {
                ...entity,
                ...patch,
              },
            },
          }
        }),

      // // fetch entity types from server after previous page sends to server
      // fetchByName: async () => {
      //   const response = await fetch("/api/entity-types")
      //   const data = await response.json()
      //   // data will have name, required, unique for each entity type
      //   // data may have color, opacity, subtype (also subtype won't be stored as an enum of type PdfAnnotationSubtype, need to convert)
      //   // need to transform data into complete EntityType objects
      //   // then transform into byName object
      //   // something like:
      //   const entityTypes: EntityType[] = []
      //   const defaultColors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"]
      //   let index = 0
      //   for (const entityType of data) {
      //     entityTypes.push({
      //       name: entityType.name,
      //       required: entityType.required,
      //       unique: entityType.unique,
      //       color: entityType.color ?? defaultColors[index % defaultColors.length],
      //       opacity: entityType.opacity ?? 0.6,
      //       subtype: PdfAnnotationSubtype[entityType.subtype as keyof typeof PdfAnnotationSubtype] ?? PdfAnnotationSubtype.HIGHLIGHT,
      //     } as EntityType)
      //     index++
      //   }
      //   const byName = Object.fromEntries(
      //     entityTypes.map((entityType: EntityType) => [entityType.name, entityType]),
      //   )
      //   set({ byName })
      // },

      reset: () => set(initialState),
    }),
    { name: "entity-type-store" },
  ),
)
export default useEntityTypeStore
