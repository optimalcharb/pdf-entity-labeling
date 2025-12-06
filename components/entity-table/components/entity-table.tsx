import { useEffect } from "react"
import { Highlighter, LineSquiggle, Strikethrough, Underline } from "lucide-react"
import { Subtype } from "@/components/pdf-container/plugin-annotation-2"
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
import useEntityTypeStore from "../hooks/use-entity-type-store"
import initialEntityTypes from "../initial-entity-types"
import ColorPicker from "./color-picker"

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
    <Table className="[&_th]:px-1.5 [&_td]:px-1.5 [&_th]:py-2.5 [&_td]:py-2">
      <TableHeader>
        <TableRow>
          <TableHead>Subtype</TableHead>
          <TableHead>Color</TableHead>
          <TableHead>Name</TableHead>
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
                  value={entityType.subtype}
                  onValueChange={(value) => {
                    // change EntityTypeStore so next activation will use new subtype
                    patchEntityType(name, {
                      subtype: value as Subtype,
                    })
                    // change PluginStore so activeSubtype matches the change if deactiveSubtypeAfterCreate is false
                    if (annoState?.activeEntityType === name) {
                      annoCapability?.setCreateAnnotationDefaults({
                        subtype: value as Subtype,
                      })
                    }
                  }}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder={entityType.subtype} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highlight">
                      <Highlighter className="w-[40px]" />
                    </SelectItem>
                    <SelectItem value="underline">
                      <Underline className="h-4 w-4" />
                    </SelectItem>
                    <SelectItem value="squiggly">
                      <LineSquiggle className="h-4 w-4" />
                    </SelectItem>
                    <SelectItem value="strikeout">
                      <Strikethrough className="h-4 w-4" />
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <ColorPicker
                  value={entityType.color}
                  onChange={(color) => {
                    // change EntityTypeStore so next ET activation will use new color
                    patchEntityType(name, {
                      color,
                    })
                    // change PluginStore so activeColor matches the change if deactiveSubtypeAfterCreate is false
                    if (annoState?.activeEntityType === name) {
                      annoCapability?.setCreateAnnotationDefaults({
                        color,
                      })
                    }
                  }}
                />
              </TableCell>
              <TableCell>{name}</TableCell>
              <TableCell
                className={!annotationText ? "cursor-pointer" : ""}
                onClick={() => {
                  activateEntityType(name)
                }}
              >
                {isActive ? "Select text..." : annotationText || "Press to assign..."}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
export default EntityTable
