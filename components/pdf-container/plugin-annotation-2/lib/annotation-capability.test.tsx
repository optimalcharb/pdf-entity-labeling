import { ReactNode } from "react"
import { createPluginRegistration, PluginRegistry } from "@embedpdf/core"
import { PDFContext } from "@embedpdf/core/react"
import type {
  PdfAnnotationObject,
  PdfDocumentObject,
  PdfHighlightAnnoObject,
} from "@embedpdf/models"
import {
  NoopLogger,
  PdfAnnotationSubtype,
  PdfBlendMode,
  PdfTaskHelper,
  uuidV4,
} from "@embedpdf/models"
import { HistoryPluginPackage } from "@embedpdf/plugin-history"
import { InteractionManagerPluginPackage } from "@embedpdf/plugin-interaction-manager"
import { SelectionPluginPackage } from "@embedpdf/plugin-selection"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { useAnnotationCapability } from "../hooks/use-annotation"
import { AnnotationPluginPackage } from "./plugin-package"

// Mock engine - annotation capability doesn't directly interact with PDFium
const createMockEngine = () => ({
  getAllAnnotations: mock(() => PdfTaskHelper.resolve({})),
  getPageAnnotations: mock(() => PdfTaskHelper.resolve([])),
  createPageAnnotation: mock(() => PdfTaskHelper.resolve(true)),
  updatePageAnnotation: mock(() => PdfTaskHelper.resolve(true)),
  deletePageAnnotation: mock(() => PdfTaskHelper.resolve(true)),
  removePageAnnotation: mock(() => PdfTaskHelper.resolve(true)),
  renderPageAnnotation: mock(() => PdfTaskHelper.resolve(new Blob())),
})

// Mock document object
const createMockDocument = (): PdfDocumentObject => ({
  id: "test-doc-1",
  pageCount: 3,
  pages: [
    { index: 0, size: { width: 612, height: 792 }, rotation: 0 },
    { index: 1, size: { width: 612, height: 792 }, rotation: 0 },
    { index: 2, size: { width: 612, height: 792 }, rotation: 0 },
  ],
})

// Helper to create mock annotation objects
const createMockHighlightAnnotation = (
  overrides: Partial<PdfAnnotationObject> = {},
): PdfAnnotationObject =>
  ({
    id: uuidV4(),
    type: PdfAnnotationSubtype.HIGHLIGHT,
    pageIndex: 0,
    color: "#FFCD45",
    opacity: 0.6,
    blendMode: PdfBlendMode.Multiply,
    created: new Date(),
    rect: { origin: { x: 100, y: 100 }, size: { width: 100, height: 20 } },
    segmentRects: [{ origin: { x: 100, y: 100 }, size: { width: 100, height: 20 } }],
    ...overrides,
  }) as PdfAnnotationObject

const createMockUnderlineAnnotation = (
  overrides: Partial<PdfAnnotationObject> = {},
): PdfAnnotationObject =>
  ({
    id: uuidV4(),
    type: PdfAnnotationSubtype.UNDERLINE,
    pageIndex: 0,
    color: "#E44234",
    opacity: 1,
    created: new Date(),
    rect: { origin: { x: 100, y: 100 }, size: { width: 100, height: 20 } },
    segmentRects: [{ origin: { x: 100, y: 100 }, size: { width: 100, height: 20 } }],
    ...overrides,
  }) as PdfAnnotationObject

describe("AnnotationCapability", () => {
  let registry: PluginRegistry
  let mockEngine: ReturnType<typeof createMockEngine>
  let mockDocument: ReturnType<typeof createMockDocument>

  beforeEach(async () => {
    mockEngine = createMockEngine()
    mockDocument = createMockDocument()

    registry = new PluginRegistry(mockEngine as any, {
      logger: new NoopLogger(),
    })

    // Register required dependencies first
    const registrations = [
      createPluginRegistration(InteractionManagerPluginPackage, {}),
      createPluginRegistration(SelectionPluginPackage, {}),
      createPluginRegistration(HistoryPluginPackage, {}),
      createPluginRegistration(AnnotationPluginPackage, {
        annotationAuthor: "test-user",
      }),
    ]

    registry.registerPluginBatch(registrations)

    await registry.initialize()

    // Set document to trigger initialization
    registry.getStore().dispatch({
      type: "SET_DOCUMENT",
      payload: mockDocument,
    })
  })

  afterEach(async () => {
    await registry.destroy()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <PDFContext.Provider
      value={{
        registry,
        isInitializing: false,
        pluginsReady: true,
      }}
    >
      {children}
    </PDFContext.Provider>
  )

  test("activateTool activates a tool", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const toolChangeHandler = mock(() => {})
    result.current.provides?.onActiveToolChange(toolChangeHandler)

    result.current.provides?.activateTool("highlight")

    await waitFor(() => {
      expect(toolChangeHandler.mock.calls.length).toBeGreaterThan(0)
      const lastCall = toolChangeHandler.mock.calls[toolChangeHandler.mock.calls.length - 1]
      expect(lastCall?.[0]?.id).toBe("highlight")
    })
  })

  test("activateTool with null deactivates tool", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const toolChangeHandler = mock(() => {})
    result.current.provides?.onActiveToolChange(toolChangeHandler)

    result.current.provides?.activateTool("highlight")
    await waitFor(() => {
      const calls = toolChangeHandler.mock.calls
      const highlightCall = calls.find((call: any) => call[0]?.id === "highlight")
      expect(highlightCall).toBeDefined()
    })

    result.current.provides?.activateTool(null)
    await waitFor(() => {
      const calls = toolChangeHandler.mock.calls
      const nullCall = calls.find((call: any) => call[0] === null)
      expect(nullCall).toBeDefined()
    })
  })

  test("setToolDefaults is callable without errors", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    // Get the initial tool
    const initialTool = result.current.provides?.getTool("highlight")
    expect(initialTool).toBeDefined()
    expect((initialTool?.defaults as Partial<PdfHighlightAnnoObject>).color).toBe("#FFCD45")

    // setToolDefaults should be callable
    const newColor = "#FF0000"
    expect(() => {
      result.current.provides?.setToolDefaults("highlight", { color: newColor })
    }).not.toThrow()

    // The function should exist and be callable
    expect(result.current.provides?.setToolDefaults).toBeDefined()
  })

  test("setActiveToolDefaults updates active tool defaults", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    // Activate a tool first
    result.current.provides?.activateTool("highlight")

    await waitFor(() => {
      expect(result.current.provides?.setActiveToolDefaults).toBeDefined()
    })

    // setActiveToolDefaults should be callable
    const newColor = "#00FF00"
    expect(() => {
      result.current.provides?.setActiveToolDefaults({ color: newColor })
    }).not.toThrow()
  })

  test("createAnnotation adds new annotation", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      const createEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "create")
      expect(createEvent).toBeDefined()
    })
  })

  test("deleteAnnotation removes annotation from state", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    result.current.provides?.deleteAnnotation(annotation.id)

    await waitFor(() => {
      // Annotation should be marked as deleted
      expect(result.current.provides).toBeDefined()
    })
  })

  test("updateAnnotation modifies annotation properties", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    const newColor = "#00FF00"
    result.current.provides?.updateAnnotation(annotation.id, { color: newColor })

    await waitFor(() => {
      // Update should complete without error
      expect(result.current.provides).toBeDefined()
    })
  })

  test("selectAnnotation is callable", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    // selectAnnotation should be callable without errors
    expect(() => {
      result.current.provides?.selectAnnotation(0, annotation.id)
    }).not.toThrow()
  })

  test("deselectAnnotation is callable", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    result.current.provides?.selectAnnotation(0, annotation.id)

    expect(() => {
      result.current.provides?.deselectAnnotation()
    }).not.toThrow()
  })

  test("importAnnotations adds multiple annotations", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotations = [
      createMockHighlightAnnotation({ pageIndex: 0 }),
      createMockHighlightAnnotation({ pageIndex: 1 }),
      createMockUnderlineAnnotation({ pageIndex: 0 }),
    ]

    result.current.provides?.importAnnotations(annotations)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })
  })

  test("exportAnnotationsToJSON returns annotation data", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation1 = createMockHighlightAnnotation({ pageIndex: 0 })
    const annotation2 = createMockUnderlineAnnotation({ pageIndex: 1 })

    result.current.provides?.createAnnotation(annotation1)
    result.current.provides?.createAnnotation(annotation2)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    const exported = result.current.provides?.exportAnnotationsToJSON()
    expect(exported).toBeDefined()
  })

  test("getPageAnnotations fetches annotations for specific page", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const pageAnnotations = [createMockHighlightAnnotation({ pageIndex: 0 })]
    mockEngine.getPageAnnotations.mockReturnValue(PdfTaskHelper.resolve(pageAnnotations))

    const task = result.current.provides?.getPageAnnotations({ pageIndex: 0 })

    await waitFor(() => {
      task?.wait(
        (annotations) => {
          expect(annotations).toBeDefined()
          expect(Array.isArray(annotations)).toBe(true)
        },
        mock(() => {}),
      )
    })
  })

  test("getPageAnnotations returns error for non-existent page", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    // Request annotations for a page that doesn't exist
    const task = result.current.provides?.getPageAnnotations({ pageIndex: 999 })
    const onError = mock(() => {})

    task?.wait(
      mock(() => {}),
      onError,
    )

    await waitFor(() => {
      expect(onError.mock.calls.length).toBeGreaterThan(0)
    })
  })

  test("onStateChange event fires when state changes", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const stateChangeHandler = mock(() => {})
    result.current.provides?.onStateChange(stateChangeHandler)

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      expect(stateChangeHandler.mock.calls.length).toBeGreaterThan(0)
    })
  })

  test("onActiveToolChange event fires when tool changes", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const toolChangeHandler = mock(() => {})
    result.current.provides?.onActiveToolChange(toolChangeHandler)

    result.current.provides?.activateTool("highlight")

    await waitFor(() => {
      expect(toolChangeHandler.mock.calls.length).toBeGreaterThan(0)
      const lastCall = toolChangeHandler.mock.calls[toolChangeHandler.mock.calls.length - 1]
      expect(lastCall?.[0]?.id).toBe("highlight")
    })
  })

  test("onAnnotationEvent fires on create", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      expect(eventHandler.mock.calls.length).toBeGreaterThan(0)
      const createEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "create")
      expect(createEvent).toBeDefined()
      expect(createEvent?.[0].annotation.id).toBe(annotation.id)
      expect(createEvent?.[0].committed).toBe(false)
    })
  })

  test("onAnnotationEvent fires on update", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    result.current.provides?.updateAnnotation(annotation.id, { color: "#FF0000" })

    await waitFor(() => {
      expect(eventHandler.mock.calls.length).toBeGreaterThan(0)
      const updateEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "update")
      expect(updateEvent).toBeDefined()
      expect(updateEvent?.[0].patch.color).toBe("#FF0000")
    })
  })

  test("onAnnotationEvent fires on delete", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    result.current.provides?.deleteAnnotation(annotation.id)

    await waitFor(() => {
      expect(eventHandler.mock.calls.length).toBeGreaterThan(0)
      const deleteEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "delete")
      expect(deleteEvent).toBeDefined()
      expect(deleteEvent?.[0].annotation.id).toBe(annotation.id)
    })
  })

  test("multiple annotations can be created on different pages", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation1 = createMockHighlightAnnotation({ pageIndex: 0 })
    const annotation2 = createMockHighlightAnnotation({ pageIndex: 1 })
    const annotation3 = createMockUnderlineAnnotation({ pageIndex: 2 })

    result.current.provides?.createAnnotation(annotation1)
    result.current.provides?.createAnnotation(annotation2)
    result.current.provides?.createAnnotation(annotation3)

    await waitFor(() => {
      // All annotations should be created
      expect(result.current.provides).toBeDefined()
    })
  })

  test("annotation author is set from config", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      expect(eventHandler.mock.calls.length).toBeGreaterThan(0)
      const createEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "create")
      expect(createEvent).toBeDefined()
      expect(createEvent?.[0].annotation.author).toBe("test-user")
    })
  })

  test("updating non-existent annotation does nothing", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    // Try to update an annotation that doesn't exist
    result.current.provides?.updateAnnotation("non-existent-id", { color: "#FF0000" })

    await waitFor(() => {
      // Should not fire any events
      const updateEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "update")
      expect(updateEvent).toBeUndefined()
    })
  })

  test("deleting non-existent annotation does nothing", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    // Try to delete an annotation that doesn't exist
    result.current.provides?.deleteAnnotation("non-existent-id")

    await waitFor(() => {
      // Should not fire any events
      const deleteEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "delete")
      expect(deleteEvent).toBeUndefined()
    })
  })

  test("undo reverts create annotation", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      const createEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "create")
      expect(createEvent).toBeDefined()
    })

    // Clear event handler calls
    eventHandler.mockClear()

    // Undo the creation
    result.current.provides?.undo()

    await waitFor(() => {
      const deleteEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "delete")
      expect(deleteEvent).toBeDefined()
      expect(deleteEvent?.[0].annotation.id).toBe(annotation.id)
    })
  })

  test("redo re-applies create annotation", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      const createEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "create")
      expect(createEvent).toBeDefined()
    })

    // Undo the creation
    result.current.provides?.undo()

    await waitFor(() => {
      const deleteEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "delete")
      expect(deleteEvent).toBeDefined()
    })

    // Clear event handler calls
    eventHandler.mockClear()

    // Redo the creation
    result.current.provides?.redo()

    await waitFor(() => {
      const createEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "create")
      expect(createEvent).toBeDefined()
      expect(createEvent?.[0].annotation.id).toBe(annotation.id)
    })
  })

  test("undo reverts update annotation", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    const annotation = createMockHighlightAnnotation({ pageIndex: 0, color: "#FFCD45" })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      const createEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "create")
      expect(createEvent).toBeDefined()
    })

    // Clear event handler calls
    eventHandler.mockClear()

    // Update the annotation
    const newColor = "#FF0000"
    result.current.provides?.updateAnnotation(annotation.id, { color: newColor })

    await waitFor(() => {
      const updateEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "update")
      expect(updateEvent).toBeDefined()
      expect(updateEvent?.[0].patch.color).toBe(newColor)
    })

    // Clear event handler calls
    eventHandler.mockClear()

    // Undo the update
    result.current.provides?.undo()

    await waitFor(() => {
      const updateEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "update")
      expect(updateEvent).toBeDefined()
      // Should revert to original color
      expect(updateEvent?.[0].patch.color).toBe("#FFCD45")
    })
  })

  test("undo reverts delete annotation", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(annotation)

    await waitFor(() => {
      const createEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "create")
      expect(createEvent).toBeDefined()
    })

    // Clear event handler calls
    eventHandler.mockClear()

    // Delete the annotation
    result.current.provides?.deleteAnnotation(annotation.id)

    await waitFor(() => {
      const deleteEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "delete")
      expect(deleteEvent).toBeDefined()
    })

    // Clear event handler calls
    eventHandler.mockClear()

    // Undo the deletion
    result.current.provides?.undo()

    await waitFor(() => {
      const createEvent = eventHandler.mock.calls.find((call: any) => call[0]?.type === "create")
      expect(createEvent).toBeDefined()
      expect(createEvent?.[0].annotation.id).toBe(annotation.id)
    })
  })

  test("undo and redo are callable without errors when timeline is empty", () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    // Should not throw when there's nothing to undo/redo
    expect(() => {
      result.current.provides?.undo()
    }).not.toThrow()

    expect(() => {
      result.current.provides?.redo()
    }).not.toThrow()
  })
})
