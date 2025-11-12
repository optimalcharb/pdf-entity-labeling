"use client"

import { useEffect } from 'react'

interface KeyboardNavigationProps {
  children: React.ReactNode
}

export function KeyboardNavigation({ children }: KeyboardNavigationProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            // Save/export functionality could be triggered here
            break
          case 'z':
            e.preventDefault()
            // Undo functionality could be triggered here
            break
          case 'y':
            e.preventDefault()
            // Redo functionality could be triggered here
            break
        }
      }
      
      // Escape key to close dialogs/menus
      if (e.key === 'Escape') {
        // Close any open dialogs or menus
        const activeElement = document.activeElement as HTMLElement
        if (activeElement?.blur) {
          activeElement.blur()
        }
      }
      
      // Tab navigation for accessibility
      if (e.key === 'Tab') {
        // Let default tab behavior work
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return <>{children}</>
}