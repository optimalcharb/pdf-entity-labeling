"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAnnotation } from '@/components/pdf-container/plugin-annotation-2'
import { useEntityState } from '@/hooks/use-entity-state'
import { EntityType, EntityAnnotation } from '@/lib/entity-types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn-ui/table'
import { Button } from '@/components/shadcn-ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn-ui/popover'
import { Badge } from '@/components/shadcn-ui/badge'
import { Palette, Underline, Highlighter, Type } from 'lucide-react'

const ANNOTATION_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B739', '#52C234', '#FF5733', '#C70039', '#900C3F'
]

const ANNOTATION_TYPES = [
  { value: 'highlight', label: 'Highlight', icon: Highlighter },
  { value: 'underline', label: 'Underline', icon: Underline },
  { value: 'squiggly', label: 'Squiggly', icon: Type },
] as const

interface StyleControlProps {
  entityType: EntityType
  onUpdate: (updates: Partial<EntityType>) => void
}

function StyleControl({ entityType, onUpdate }: StyleControlProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label={`Style ${entityType.name}`}
        >
          <Palette size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Color</label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {ANNOTATION_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-12 h-8 rounded border-2 ${
                    entityType.color === color ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onUpdate({ color })
                    setIsOpen(false)
                  }}
                  aria-label={`Select ${color}`}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Annotation Type</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {ANNOTATION_TYPES.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={entityType.annotationType === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    onUpdate({ annotationType: value as EntityType['annotationType'] })
                    setIsOpen(false)
                  }}
                  className="flex items-center gap-1"
                >
                  <Icon size={14} />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface EntityTableRowProps {
  entityType: EntityType
  annotations: EntityAnnotation[]
  onUpdate: (updates: Partial<EntityType>) => void
  onSelectAnnotation: (annotationId: string) => void
  isFocused: boolean
  onFocus: () => void
}

function EntityTableRow({ 
  entityType, 
  annotations, 
  onUpdate, 
  onSelectAnnotation,
  isFocused,
  onFocus
}: EntityTableRowProps) {
  const { state: annotationState } = useAnnotation()
  
  const getAnnotationText = useCallback((annotationId: string) => {
    const trackedAnnotation = annotationState?.byUid[annotationId]
    return (trackedAnnotation?.object as any)?.contents || 'Unknown text'
  }, [annotationState])

  const handleRowClick = useCallback(() => {
    if (annotations.length > 0) {
      onSelectAnnotation(annotations[0]!.annotationId)
    }
    onFocus()
  }, [annotations, onSelectAnnotation, onFocus])

  return (
    <TableRow 
      className={`cursor-pointer ${isFocused ? 'bg-blue-50' : ''}`}
      onClick={handleRowClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleRowClick()
        }
      }}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded"
            style={{ backgroundColor: entityType.color }}
          />
          {entityType.name}
          {entityType.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
          {entityType.unique && <Badge variant="secondary" className="text-xs">Unique</Badge>}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {annotations.length === 0 ? (
            <span className="text-gray-400 text-sm">No annotations yet</span>
          ) : (
            annotations.map((entityAnnotation) => (
              <div 
                key={entityAnnotation.id}
                className="flex items-center gap-2 text-sm p-1 rounded hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectAnnotation(entityAnnotation.annotationId)
                }}
              >
                <span className="flex-1 truncate">
                  {getAnnotationText(entityAnnotation.annotationId)}
                </span>
                <span className="text-xs text-gray-500">
                  Page {entityAnnotation.pageIndex + 1}
                </span>
              </div>
            ))
          )}
        </div>
      </TableCell>
      <TableCell>
        <StyleControl entityType={entityType} onUpdate={onUpdate} />
      </TableCell>
    </TableRow>
  )
}

interface EntityTableProps {
  onSelectAnnotation: (annotationId: string) => void
}

export function EntityTable({ onSelectAnnotation }: EntityTableProps) {
  const { entityState, updateEntityType, getAnnotationsForEntityType, selectAnnotation } = useEntityState()
  const [focusedIndex, setFocusedIndex] = useState(0)
  const tableRef = useRef<HTMLTableElement>(null)

  const handleSelectAnnotation = useCallback((annotationId: string) => {
    selectAnnotation(annotationId)
    onSelectAnnotation(annotationId)
  }, [selectAnnotation, onSelectAnnotation])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!tableRef.current) return
    
    const rows = Array.from(tableRef.current.querySelectorAll('tbody tr'))
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, rows.length - 1))
        rows[focusedIndex + 1]?.focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
        rows[focusedIndex - 1]?.focus()
        break
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        rows[0]?.focus()
        break
      case 'End':
        e.preventDefault()
        setFocusedIndex(rows.length - 1)
        rows[rows.length - 1]?.focus()
        break
    }
  }, [focusedIndex])

  useEffect(() => {
    const table = tableRef.current
    if (!table) return
    
    table.addEventListener('keydown', handleKeyDown)
    return () => table.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Entity Types</h2>
        <p className="text-sm text-gray-600">
          Configure entity types and link annotations to them
        </p>
      </div>
      
      <div className="flex-1 overflow-auto">
        <Table ref={tableRef}>
          <TableHeader>
            <TableRow>
              <TableHead>Entity Type</TableHead>
              <TableHead>Annotations</TableHead>
              <TableHead>Style</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entityState.entityTypes.map((entityType: EntityType, index: number) => (
              <EntityTableRow
                key={entityType.id}
                entityType={entityType}
                annotations={getAnnotationsForEntityType(entityType.id)}
                onUpdate={(updates) => updateEntityType(entityType.id, updates)}
                onSelectAnnotation={handleSelectAnnotation}
                isFocused={focusedIndex === index}
                onFocus={() => setFocusedIndex(index)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}