export interface EntityType {
  id: string
  name: string
  color: string
  annotationType: 'highlight' | 'underline' | 'squiggly'
  required?: boolean
  unique?: boolean
  singleWord?: boolean
}

export interface EntityAnnotation {
  id: string
  entityTypeId: string
  annotationId: string // Reference to the annotation ID in the annotation system
  text: string
  pageIndex: number
}

export interface EntityStyle {
  entityTypeId: string
  color: string
  annotationType: 'highlight' | 'underline' | 'squiggly'
}

export interface EntityState {
  entityTypes: EntityType[]
  entityAnnotations: EntityAnnotation[]
  selectedEntityTypeId: string | null
}

export const defaultEntityTypes: EntityType[] = [
  { id: 'person', name: 'Person', color: '#FF6B6B', annotationType: 'highlight' },
  { id: 'organization', name: 'Organization', color: '#4ECDC4', annotationType: 'underline' },
  { id: 'location', name: 'Location', color: '#45B7D1', annotationType: 'squiggly' },
  { id: 'date', name: 'Date', color: '#96CEB4', annotationType: 'highlight' },
  { id: 'money', name: 'Money', color: '#FFEAA7', annotationType: 'underline' },
]