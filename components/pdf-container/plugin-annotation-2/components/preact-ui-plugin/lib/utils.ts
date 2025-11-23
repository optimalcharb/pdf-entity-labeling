import type { CustomComponent } from "./types"

export function defineComponent<TInit, TProps, TStore = any>() {
  return <
    C extends CustomComponent<TStore> & {
      initialState: TInit
      props: (init: TInit) => TProps
      mapStateToProps: (storeState: TStore, ownProps: TProps) => TProps
    },
  >(
    c: C,
  ) => c
}

/**
 * Type definition for event callbacks
 */
export type EventCallback = (data: any) => void

/**
 * Interface for the event controller
 */
export interface EventController {
  /**
   * Emit an event of the specified type with the given data
   */
  emit(eventType: string, data: any): void

  /**
   * Subscribe to events of the specified type
   * Returns a function that can be called to unsubscribe
   */
  on(eventType: string, callback: EventCallback): () => void

  /**
   * Unsubscribe a specific callback from events of the specified type
   */
  off(eventType: string, callback: EventCallback): void
}

/**
 * Creates an event controller that manages event subscriptions and dispatching
 * This is a lightweight pub/sub implementation for typed events
 */
export function createEventController(): EventController {
  // Map of event types to sets of callbacks
  const eventMap = new Map<string, Set<EventCallback>>()

  return {
    emit(eventType: string, data: any): void {
      const callbacks = eventMap.get(eventType)
      if (callbacks) {
        // Call each callback with the event data
        callbacks.forEach((callback) => callback(data))
      }
    },

    on(eventType: string, callback: EventCallback): () => void {
      // Create a set for this event type if it doesn't exist
      if (!eventMap.has(eventType)) {
        eventMap.set(eventType, new Set())
      }

      // Add the callback to the set
      const callbacks = eventMap.get(eventType)!
      callbacks.add(callback)

      // Return a function that removes this specific callback
      return () => this.off(eventType, callback)
    },

    off(eventType: string, callback: EventCallback): void {
      const callbacks = eventMap.get(eventType)
      if (callbacks) {
        // Remove the callback from the set
        callbacks.delete(callback)

        // Clean up empty sets
        if (callbacks.size === 0) {
          eventMap.delete(eventType)
        }
      }
    },
  }
}
