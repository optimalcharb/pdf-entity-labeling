import { Subtype } from "../pdf-container/plugin-annotation-2"

export interface EntityType {
  name: string
  subtype: Subtype
  color: string
  opacity: number
  unique: boolean
  required: boolean
}
