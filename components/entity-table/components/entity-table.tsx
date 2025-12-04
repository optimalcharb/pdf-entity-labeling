import { useEffect } from "react"
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
  const { byName: entityTypesByName, setByName } = useEntityTypeStore()

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
              <TableCell>{name}</TableCell>
              <TableCell>{entityType.subtype}</TableCell>
              <TableCell>{entityType.color}</TableCell>
              <TableCell>{entityType.opacity}</TableCell>
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
