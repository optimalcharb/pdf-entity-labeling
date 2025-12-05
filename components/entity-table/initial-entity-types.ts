import type { EntityType } from "./entity-type"

const initialEntityTypes0: Pick<EntityType, "name" | "subtype">[] = [
  {
    name: "Register ID",
    subtype: "highlight",
  },
  {
    name: "Register Volume",
    subtype: "underline",
  },
  {
    name: "Register Number",
    subtype: "underline",
  },
  {
    name: "Register Date",
    subtype: "highlight",
  },
  {
    name: "Effective Date",
    subtype: "highlight",
  },
  {
    name: "Title",
    subtype: "highlight",
  },
  {
    name: "Agency",
    subtype: "highlight",
  },
  {
    name: "Action",
    subtype: "highlight",
  },
  {
    name: "Summary",
    subtype: "squiggly",
  },
  {
    name: "Contact Name",
    subtype: "highlight",
  },
  {
    name: "Contact Position",
    subtype: "highlight",
  },
  {
    name: "Contact Email",
    subtype: "highlight",
  },
]

const initialColors = [
  "#FFEB3B", // Bright Yellow
  "#FF9800", // Orange
  "#FF5722", // Deep Orange
  "#FF4081", // Hot Pink
  "#E040FB", // Purple
  "#7C4DFF", // Electric Violet
  "#536DFE", // Indigo
  "#40C4FF", // Light Blue
  "#00E5FF", // Cyan
  "#69F0AE", // Mint Green
]

const initialEntityTypes: EntityType[] = []
for (const initialEntityType of initialEntityTypes0) {
  initialEntityTypes.push({
    ...initialEntityType,
    color: initialColors[Math.floor(Math.random() * initialColors.length)] || "#FFEB3B",
    opacity: initialEntityType.subtype === "highlight" ? Math.random() * 0.2 + 0.6 : 1,
    unique: true,
    required: true,
  })
}
export default initialEntityTypes
