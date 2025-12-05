import { useEffect } from "react"
import { PdfAnnotationSubtype } from "@embedpdf/models"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn-ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn-ui/table"
import usePluginStore from "../../plugin-store/hooks/use-plugin-store"
// import type { EntityType } from "../entity-type"
import useEntityTypeStore from "../hooks/use-entity-type-store"
import initialEntityTypes from "../initial-entity-types"

const EntityTable = () => {
  // **IMPORTANT**
  // annoState contains the whole AnnotationState
  // annoState?.byEntityType gives ET name -> array of UIDs of annotations
  // annoState?.byUid[uid].object.contents - text of annotation
  const { annoState, annoCapability } = usePluginStore()

  // entityTypesByName is a record of name -> EntityType
  const { byName: entityTypesByName, setByName, patchEntityType } = useEntityTypeStore()

  // set initial entity types
  useEffect(() => {
    setByName(
      Object.fromEntries(initialEntityTypes.map((entityType) => [entityType.name, entityType])),
    )
  }, [setByName])

  // example usage of entityTypesByName
  // const entityTypeObject1 = entityTypesByName["Highlight"] as EntityType
  // const entityTypeNames: string[] = Object.keys(entityTypesByName)

  // uses annoCapability to set the default attributes for an annotation that the user creates
  const activateEntityType = (entityTypeName: string) => {
    const entityType = entityTypesByName[entityTypeName]
    if (!entityType) return
    annoCapability?.setCreateAnnotationDefaults({
      entityType: entityType.name,
      subtype: entityType.subtype,
      color: entityType.color,
      opacity: entityType.opacity,
    })
  }

  // now you will need to make a table that allows the users to activate an entity type and have the table display the resulting contents of the annotation that the user creates

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Subtype</TableHead>
          <TableHead>Color</TableHead>
          <TableHead>Opacity</TableHead>
          <TableHead>EntityValue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(entityTypesByName).map(([name, entityType]) => {
          const annotationUids = annoState?.byEntityType?.[name] || []
          const firstUid = annotationUids[0]
          const annotation = firstUid ? annoState?.byUid?.[firstUid] : null
          const annotationText = annotation?.object.contents || ""
          const isActive = annoState?.activeEntityType === name

          return (
            <TableRow key={name}>
              <TableCell>
                <Select
                  value={subtypeEnumToString(entityType.subtype)}
                  onValueChange={(value) => {
                    patchEntityType(name, {
                      subtype: subtypeStringToEnum(value) || PdfAnnotationSubtype.HIGHLIGHT,
                    })
                  }}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Select subtype" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highlight">Highlight</SelectItem>
                    <SelectItem value="underline">Underline</SelectItem>
                    <SelectItem value="squiggly">Squiggly</SelectItem>
                    <SelectItem value="strikeout">Strikeout</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{entityType.color}</TableCell>
              <TableCell>{name}</TableCell>
              <TableCell
                className={!annotationText ? "cursor-pointer" : ""}
                onClick={() => {
                  if (!annotationText) {
                    activateEntityType(name)
                  }
                }}
              >
                {annotationText || (isActive ? "Active..." : "")}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
export default EntityTable

function subtypeStringToEnum(subtype: string): PdfAnnotationSubtype | null {
  switch (subtype) {
    case "highlight":
      return PdfAnnotationSubtype.HIGHLIGHT
    case "underline":
      return PdfAnnotationSubtype.UNDERLINE
    case "squiggly":
      return PdfAnnotationSubtype.SQUIGGLY
    case "strikeout":
      return PdfAnnotationSubtype.STRIKEOUT
    default:
      return null
  }
}

function subtypeEnumToString(subtype: PdfAnnotationSubtype): string {
  switch (subtype) {
    case PdfAnnotationSubtype.HIGHLIGHT:
      return "highlight"
    case PdfAnnotationSubtype.UNDERLINE:
      return "underline"
    case PdfAnnotationSubtype.SQUIGGLY:
      return "squiggly"
    case PdfAnnotationSubtype.STRIKEOUT:
      return "strikeout"
    default:
      return "highlight"
  }
}
