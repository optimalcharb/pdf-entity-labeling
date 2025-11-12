"use client"

import { useState, useEffect } from 'react'
import { useAnnotation } from '@/components/pdf-container/plugin-annotation-2'
import { useEntityState } from '@/hooks/use-entity-state'
import { EntityAnnotation, EntityType } from '@/lib/entity-types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn-ui/dialog'
import { Button } from '@/components/shadcn-ui/button'
import { Badge } from '@/components/shadcn-ui/badge'

interface EntitySelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  annotationId: string
  annotationText: string
}

export function EntitySelectionDialog({ 
  isOpen, 
  onClose, 
  annotationId, 
  annotationText 
}: EntitySelectionDialogProps) {
  const { entityState, linkAnnotationToEntity, unlinkAnnotation } = useEntityState()
  
  const currentLink = entityState.entityAnnotations.find(
    (ea: EntityAnnotation) => ea.annotationId === annotationId
  )

  const handleEntitySelect = (entityTypeId: string) => {
    linkAnnotationToEntity(entityTypeId, annotationId)
    onClose()
  }

  const handleUnlink = () => {
    if (currentLink) {
      unlinkAnnotation(annotationId)
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Entity Type</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Selected Text:</p>
            <p className="text-sm bg-gray-100 p-2 rounded mt-1">{annotationText}</p>
          </div>
          
          {currentLink && (
            <div>
              <p className="text-sm font-medium text-gray-700">Currently assigned to:</p>
              <Badge className="mt-1">
                {entityState.entityTypes.find((et: EntityType) => et.id === currentLink.entityTypeId)?.name}
              </Badge>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Assign to entity type:</p>
            <div className="space-y-2">
              {entityState.entityTypes.map((entityType: EntityType) => (
                <Button
                  key={entityType.id}
                  variant={currentLink?.entityTypeId === entityType.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleEntitySelect(entityType.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: entityType.color }}
                    />
                    <span>{entityType.name}</span>
                    {entityType.required && (
                      <Badge variant="destructive" className="text-xs ml-auto">Required</Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
          
          {currentLink && (
            <div className="pt-2 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleUnlink}
                className="w-full"
              >
                Remove Entity Assignment
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface EntitySelectionHandlerProps {
  children: (props: {
    openEntitySelection: (annotationId: string, annotationText: string) => void
  }) => React.ReactNode
}

export function EntitySelectionHandler({ children }: EntitySelectionHandlerProps) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    annotationId: string
    annotationText: string
  }>({
    isOpen: false,
    annotationId: '',
    annotationText: '',
  })

  const openEntitySelection = (annotationId: string, annotationText: string) => {
    setDialogState({
      isOpen: true,
      annotationId,
      annotationText,
    })
  }

  const closeDialog = () => {
    setDialogState({
      isOpen: false,
      annotationId: '',
      annotationText: '',
    })
  }

  return (
    <>
      {children({ openEntitySelection })}
      <EntitySelectionDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        annotationId={dialogState.annotationId}
        annotationText={dialogState.annotationText}
      />
    </>
  )
}