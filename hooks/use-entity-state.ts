import { useCallback, useEffect, useState } from 'react'
import { useAnnotation } from '@/components/pdf-container/plugin-annotation-2'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import { EntityState, EntityAnnotation, EntityType, defaultEntityTypes } from '../lib/entity-types'

const ENTITY_STATE_KEY = 'pdf-entity-labeling-state'

// Map entity annotation types to PDF subtypes
const annotationTypeMap: Record<EntityType['annotationType'], PdfAnnotationSubtype> = {
  highlight: PdfAnnotationSubtype.HIGHLIGHT,
  underline: PdfAnnotationSubtype.UNDERLINE,
  squiggly: PdfAnnotationSubtype.SQUIGGLY,
}

export function useEntityState() {
  const { state: annotationState, provides: annotationApi } = useAnnotation()
  const [entityState, setEntityState] = useState<EntityState>(() => {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ENTITY_STATE_KEY)
      if (saved) {
        const parsed: any = JSON.parse(saved)
        return {
          ...parsed,
          entityTypes: parsed.entityTypes || defaultEntityTypes,
        }
      }
    }
    return {
      entityTypes: defaultEntityTypes,
      entityAnnotations: [],
      selectedEntityTypeId: null,
    }
  })

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ENTITY_STATE_KEY, JSON.stringify(entityState))
    }
  }, [entityState])

  // Sync annotations with the annotation system
  useEffect(() => {
    if (!annotationState) return

    // Get all annotation objects from the annotation system
    const allAnnotations: EntityAnnotation[] = []
    
    Object.values(annotationState.pages).forEach((pageUids) => {
      pageUids.forEach((uid) => {
        const trackedAnnotation = annotationState.byUid[uid]
        if (trackedAnnotation && trackedAnnotation.commitState !== 'deleted') {
          // Check if this annotation is already linked to an entity
          const existingLink = entityState.entityAnnotations.find(
            (ea: EntityAnnotation) => ea.annotationId === trackedAnnotation.object.id
          )
          
          if (existingLink) {
            // Update the entity annotation with current annotation data
            allAnnotations.push({
              ...existingLink,
              text: (trackedAnnotation.object as any).contents || '',
              pageIndex: trackedAnnotation.object.pageIndex || 0,
            })
          }
        }
      })
    })

    // Remove entity annotations for deleted annotations
    const validEntityAnnotations = entityState.entityAnnotations.filter((ea: EntityAnnotation) => {
      const trackedAnnotation = annotationState.byUid[ea.annotationId]
      return trackedAnnotation && trackedAnnotation.commitState !== 'deleted'
    })

    // Update entity annotations with current text and page info
    const updatedEntityAnnotations = validEntityAnnotations.map((ea: EntityAnnotation) => {
      const trackedAnnotation = annotationState.byUid[ea.annotationId]
      return {
        ...ea,
        text: (trackedAnnotation?.object as any)?.contents || '',
        pageIndex: trackedAnnotation?.object.pageIndex || 0,
      }
    })

    setEntityState((prev: EntityState) => ({
      ...prev,
      entityAnnotations: updatedEntityAnnotations,
    }))
  }, [annotationState])

  const updateAnnotationStyle = useCallback((annotationId: string, entityType: EntityType) => {
    if (!annotationApi) return

    const trackedAnnotation = annotationState?.byUid[annotationId]
    if (!trackedAnnotation) return

    // For now, we'll just update the color. Changing annotation types is more complex
    // and would require deleting and recreating the annotation
    try {
      annotationApi.updateAnnotation(
        trackedAnnotation.object.pageIndex || 0,
        annotationId,
        {
          color: entityType.color,
        }
      )
    } catch (error) {
      console.warn('Failed to update annotation color:', error)
    }
  }, [annotationApi, annotationState])

  const linkAnnotationToEntity = useCallback((entityTypeId: string, annotationId: string) => {
    setEntityState((prev: EntityState) => {
      // Check if already linked
      const existing = prev.entityAnnotations.find(
        (ea: EntityAnnotation) => ea.annotationId === annotationId
      )
      
      if (existing) {
        // Update the existing link
        const updated = {
          ...prev,
          entityAnnotations: prev.entityAnnotations.map((ea: EntityAnnotation) =>
            ea.annotationId === annotationId
              ? { ...ea, entityTypeId }
              : ea
          ),
        }
        
        // Apply entity styling to the annotation
        const entityType = prev.entityTypes.find((et: EntityType) => et.id === entityTypeId)
        if (entityType) {
          updateAnnotationStyle(annotationId, entityType)
        }
        
        return updated
      } else {
        // Create new link
        const trackedAnnotation = annotationState?.byUid[annotationId]
        const newEntityAnnotation: EntityAnnotation = {
          id: `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          entityTypeId,
          annotationId,
          text: (trackedAnnotation?.object as any)?.contents || '',
          pageIndex: trackedAnnotation?.object.pageIndex || 0,
        }
        
        // Apply entity styling to the annotation
        const entityType = prev.entityTypes.find((et: EntityType) => et.id === entityTypeId)
        if (entityType) {
          updateAnnotationStyle(annotationId, entityType)
        }
        
        return {
          ...prev,
          entityAnnotations: [...prev.entityAnnotations, newEntityAnnotation],
        }
      }
    })
  }, [annotationState, updateAnnotationStyle])

  const unlinkAnnotation = useCallback((annotationId: string) => {
    setEntityState((prev: EntityState) => ({
      ...prev,
      entityAnnotations: prev.entityAnnotations.filter(
        (ea: EntityAnnotation) => ea.annotationId !== annotationId
      ),
    }))
  }, [])

  const updateEntityType = useCallback((entityTypeId: string, updates: Partial<EntityType>) => {
    setEntityState((prev: EntityState) => {
      const updated = {
        ...prev,
        entityTypes: prev.entityTypes.map((et: EntityType) =>
          et.id === entityTypeId ? { ...et, ...updates } : et
        ),
      }
      
      // Apply updated styling to all annotations of this entity type
      const entityType = updated.entityTypes.find((et: EntityType) => et.id === entityTypeId)
      if (entityType) {
        prev.entityAnnotations
          .filter((ea: EntityAnnotation) => ea.entityTypeId === entityTypeId)
          .forEach((ea: EntityAnnotation) => {
            updateAnnotationStyle(ea.annotationId, entityType)
          })
      }
      
      return updated
    })
  }, [updateAnnotationStyle])

  const getAnnotationsForEntityType = useCallback((entityTypeId: string) => {
    return entityState.entityAnnotations.filter((ea: EntityAnnotation) => ea.entityTypeId === entityTypeId)
  }, [entityState.entityAnnotations])

  const selectAnnotation = useCallback((annotationId: string) => {
    if (annotationApi) {
      const trackedAnnotation = annotationState?.byUid[annotationId]
      if (trackedAnnotation) {
        annotationApi.selectAnnotation(trackedAnnotation.object.pageIndex || 0, annotationId)
      }
    }
  }, [annotationApi, annotationState])

  return {
    entityState,
    linkAnnotationToEntity,
    unlinkAnnotation,
    updateEntityType,
    getAnnotationsForEntityType,
    selectAnnotation,
  }
}