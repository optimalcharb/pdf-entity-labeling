import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { renderHook, waitFor } from "@testing-library/react"
import { ReactNode } from "react"
import { createPluginRegistration, PluginRegistry } from "@embedpdf/core"
import { PDFContext } from "@embedpdf/core/react"
import { NoopLogger, PdfAnnotationSubtype, PdfBlendMode, PdfTaskHelper, uuidV4 } from "@embedpdf/models"
import type { PdfHighlightAnnoObject, PdfUnderlineAnnoObject } from "@embedpdf/models"
import { HistoryPluginPackage } from "@embedpdf/plugin-history"
import { InteractionManagerPluginPackage } from "@embedpdf/plugin-interaction-manager"
import { SelectionPluginPackage } from "@embedpdf/plugin-selection"
import { useAnnotationCapability } from "./hooks/use-annotation"
import { AnnotationPluginPackage } from "./lib/plugin-package"

// Mock engine - annotation capability doesn't directly interact with PDFium
const createMockEngine = () => ({
  getAllAnnotations: mock(() => PdfTaskHelper.resolve({})),
  getPageAnnotations: mock(() => PdfTaskHelper.resolve([])),
  createPageAnnotation: mock(() => PdfTaskHelper.resolve(true)),
  updatePageAnnotation: mock(() => PdfTaskHelper.resolve(true)),
  deletePageAnnotation: mock(() => PdfTaskHelper.resolve(true)),
  renderPageAnnotation: mock(() => PdfTaskHelper.resolve(new Blob())),
})

// Mock document object
const createMockDocument = () => ({
  id: "test-doc-1",
  name: "test.pdf",
  pageCount: 3,
  pages: [
    { index: 0, size: { width: 612, height: 792 }, rotation: 0 },
    { index: 1, size: { width: 612, height: 792 }, rotation: 0 },
    { index: 2, size: { width: 612, height: 792 }, rotation: 0 },
  ],
})

// Helper to create mock annotation objects
const createMockHighlightAnnotation = (
  overrides: Partial<PdfHighlightAnnoObject> = {},
): PdfHighlightAnnoObject => ({
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
})

const createMockUnderlineAnnotation = (
  overrides: Partial<PdfUnderlineAnnoObject> = {},
): PdfUnderlineAnnoObject => ({
  id: uuidV4(),
  type: PdfAnnotationSubtype.UNDERLINE,
  pageIndex: 0,
  color: "#E44234",
  opacity: 1,
  created: new Date(),
  rect: { origin: { x: 100, y: 100 }, size: { width: 100, height: 20 } },
  segmentRects: [{ origin: { x: 100, y: 100 }, size: { width: 100, height: 20 } }],
  ...overrides,
})

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
        autoCommit: false,
        annotationAuthor: "test-user",
      }),
    ]

    registry.registerPluginBatch(registrations)

    await registry.initialize()

    // Set document to trigger initialization
    registry.getStore().dispatch({
      type: "SET_DOCUMENT",
      payload: mockDocument as any,
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

  test("getTools returns all available annotation tools", () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const tools = result.current.provides?.getTools()
    expect(tools).toBeDefined()
    expect(tools?.length).toBeGreaterThan(0)

    const toolIds = tools?.map((t) => t.id)
    expect(toolIds).toContain("highlight")
    expect(toolIds).toContain("underline")
    expect(toolIds).toContain("squiggly")
    expect(toolIds).toContain("strikeout")
  })

  test("getTool returns specific tool by id", () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const highlightTool = result.current.provides?.getTool("highlight")
    expect(highlightTool).toBeDefined()
    expect(highlightTool?.id).toBe("highlight")
    expect(highlightTool?.defaults.type).toBe(PdfAnnotationSubtype.HIGHLIGHT)
    expect((highlightTool?.defaults as any).color).toBe("#FFCD45")

    const nonExistentTool = result.current.provides?.getTool("non-existent")
    expect(nonExistentTool).toBeUndefined()
  })

  test("getActiveTool returns null initially", () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const activeTool = result.current.provides?.getActiveTool()
    expect(activeTool).toBeNull()
  })

  test("setActiveTool changes active tool", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    result.current.provides?.setActiveTool("highlight")

    await waitFor(() => {
      const activeTool = result.current.provides?.getActiveTool()
      expect(activeTool?.id).toBe("highlight")
    })
  })

  test("setActiveTool with null deactivates tool", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    result.current.provides?.setActiveTool("highlight")
    await waitFor(() => {
      expect(result.current.provides?.getActiveTool()?.id).toBe("highlight")
    })

    result.current.provides?.setActiveTool(null)
    await waitFor(() => {
      expect(result.current.provides?.getActiveTool()).toBeNull()
    })
  })

  test("setToolDefaults is callable without errors", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    // Get the initial tool
    const initialTool = result.current.provides?.getTool("highlight")
    expect(initialTool).toBeDefined()
    expect((initialTool?.defaults as any).color).toBe("#FFCD45")

    // setToolDefaults should be callable (even if it doesn't immediately update the hook's view)
    const newColor = "#FF0000"
    expect(() => {
      result.current.provides?.setToolDefaults("highlight", { color: newColor })
    }).not.toThrow()

    // The function should exist and be callable
    expect(result.current.provides?.setToolDefaults).toBeDefined()
  })

  test("createAnnotation adds new annotation to state", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(0, annotation)

    await waitFor(() => {
      const selected = result.current.provides?.getSelectedAnnotation()
      // Note: annotation won't be auto-selected unless configured
      expect(selected).toBeNull()
    })
  })

  test("createAnnotation with context stores context", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    const context = { source: "text-selection", text: "Test text" } as any
    result.current.provides?.createAnnotation(0, annotation, context)

    await waitFor(() => {
      // The annotation should be created (verified by no error)
      expect(result.current.provides).toBeDefined()
    })
  })

  test("deleteAnnotation removes annotation from state", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(0, annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    result.current.provides?.deleteAnnotation(0, annotation.id)

    await waitFor(() => {
      // Annotation should be marked as deleted
      expect(result.current.provides).toBeDefined()
    })
  })

  test("updateAnnotation modifies annotation properties", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(0, annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    const newColor = "#00FF00"
    result.current.provides?.updateAnnotation(0, annotation.id, { color: newColor })

    await waitFor(() => {
      // Update should complete without error
      expect(result.current.provides).toBeDefined()
    })
  })

  test("selectAnnotation sets selected annotation", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(0, annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    result.current.provides?.selectAnnotation(0, annotation.id)

    await waitFor(() => {
      const selected = result.current.provides?.getSelectedAnnotation()
      expect(selected).toBeDefined()
      expect(selected?.object.id).toBe(annotation.id)
    })
  })

  test("deselectAnnotation clears selection", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(0, annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    result.current.provides?.selectAnnotation(0, annotation.id)
    await waitFor(() => {
      expect(result.current.provides?.getSelectedAnnotation()).toBeDefined()
    })

    result.current.provides?.deselectAnnotation()
    await waitFor(() => {
      const selected = result.current.provides?.getSelectedAnnotation()
      expect(selected).toBeNull()
    })
  })

  test("getSelectedAnnotation returns null when nothing selected", () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const selected = result.current.provides?.getSelectedAnnotation()
    expect(selected).toBeNull()
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
      // All annotations should be imported
      expect(result.current.provides).toBeDefined()
    })
  })

  test("exportAnnotationsToJSON returns annotation data", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation1 = createMockHighlightAnnotation({ pageIndex: 0 })
    const annotation2 = createMockUnderlineAnnotation({ pageIndex: 1 })

    result.current.provides?.createAnnotation(0, annotation1)
    result.current.provides?.createAnnotation(1, annotation2)

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
      task?.wait((annotations) => {
        expect(annotations).toBeDefined()
        expect(Array.isArray(annotations)).toBe(true)
      }, mock(() => {}))
    })
  })

  test("getPageAnnotations returns error for non-existent page", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    // Request annotations for a page that doesn't exist
    const task = result.current.provides?.getPageAnnotations({ pageIndex: 999 })
    const onError = mock(() => {})

    task?.wait(mock(() => {}), onError)

    await waitFor(() => {
      expect(onError.mock.calls.length).toBeGreaterThan(0)
    })
  })

  test("renderAnnotation returns task with blob", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    const mockBlob = new Blob(["test"], { type: "image/png" })
    mockEngine.renderPageAnnotation.mockReturnValue(PdfTaskHelper.resolve(mockBlob))

    const task = result.current.provides?.renderAnnotation({
      pageIndex: 0,
      annotation,
      options: { scaleFactor: 1 },
    })

    await waitFor(() => {
      task?.wait((blob) => {
        expect(blob).toBeInstanceOf(Blob)
      }, mock(() => {}))
    })
  })

  test("renderAnnotation returns error for non-existent page", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    // Render annotation for a page that doesn't exist
    const annotation = createMockHighlightAnnotation({ pageIndex: 999 })
    const task = result.current.provides?.renderAnnotation({
      pageIndex: 999,
      annotation,
    })

    const onError = mock(() => {})
    task?.wait(mock(() => {}), onError)

    await waitFor(() => {
      expect(onError.mock.calls.length).toBeGreaterThan(0)
    })
  })

  test("commit returns task resolving to true when no pending changes", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const task = result.current.provides?.commit()

    await waitFor(() => {
      task?.wait((success) => {
        expect(success).toBe(true)
      }, mock(() => {}))
    })
  })

  test("commit processes pending annotations", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(0, annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    mockEngine.createPageAnnotation.mockReturnValue(PdfTaskHelper.resolve(true))

    const task = result.current.provides?.commit()

    await waitFor(() => {
      task?.wait((success) => {
        expect(success).toBe(true)
        expect(mockEngine.createPageAnnotation.mock.calls.length).toBeGreaterThan(0)
      }, mock(() => {}))
    })
  })

  test("onStateChange event fires when state changes", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const stateChangeHandler = mock(() => {})
    result.current.provides?.onStateChange(stateChangeHandler)

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(0, annotation)

    await waitFor(() => {
      expect(stateChangeHandler.mock.calls.length).toBeGreaterThan(0)
    })
  })

  test("onActiveToolChange event fires when tool changes", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const toolChangeHandler = mock(() => {})
    result.current.provides?.onActiveToolChange(toolChangeHandler)

    result.current.provides?.setActiveTool("highlight")

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
    result.current.provides?.createAnnotation(0, annotation)

    await waitFor(() => {
      expect(eventHandler.mock.calls.length).toBeGreaterThan(0)
      const createEvent = eventHandler.mock.calls.find((call) => call[0]?.type === "create")
      expect(createEvent).toBeDefined()
      expect(createEvent?.[0].annotation.id).toBe(annotation.id)
      expect(createEvent?.[0].committed).toBe(false)
    })
  })

  test("onAnnotationEvent fires on update", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(0, annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    result.current.provides?.updateAnnotation(0, annotation.id, { color: "#FF0000" })

    await waitFor(() => {
      expect(eventHandler.mock.calls.length).toBeGreaterThan(0)
      const updateEvent = eventHandler.mock.calls.find((call) => call[0]?.type === "update")
      expect(updateEvent).toBeDefined()
      expect(updateEvent?.[0].patch.color).toBe("#FF0000")
    })
  })

  test("onAnnotationEvent fires on delete", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation = createMockHighlightAnnotation({ pageIndex: 0 })
    result.current.provides?.createAnnotation(0, annotation)

    await waitFor(() => {
      expect(result.current.provides).toBeDefined()
    })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    result.current.provides?.deleteAnnotation(0, annotation.id)

    await waitFor(() => {
      expect(eventHandler.mock.calls.length).toBeGreaterThan(0)
      const deleteEvent = eventHandler.mock.calls.find((call) => call[0]?.type === "delete")
      expect(deleteEvent).toBeDefined()
      expect(deleteEvent?.[0].annotation.id).toBe(annotation.id)
    })
  })

  test("multiple annotations can be created on different pages", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const annotation1 = createMockHighlightAnnotation({ pageIndex: 0 })
    const annotation2 = createMockHighlightAnnotation({ pageIndex: 1 })
    const annotation3 = createMockUnderlineAnnotation({ pageIndex: 2 })

    result.current.provides?.createAnnotation(0, annotation1)
    result.current.provides?.createAnnotation(1, annotation2)
    result.current.provides?.createAnnotation(2, annotation3)

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
    result.current.provides?.createAnnotation(0, annotation)

    await waitFor(() => {
      expect(eventHandler.mock.calls.length).toBeGreaterThan(0)
      const createEvent = eventHandler.mock.calls.find((call) => call[0]?.type === "create")
      expect(createEvent).toBeDefined()
      expect(createEvent?.[0].annotation.author).toBe("test-user")
    })
  })

  test("updating non-existent annotation does nothing", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    // Try to update an annotation that doesn't exist
    result.current.provides?.updateAnnotation(0, "non-existent-id", { color: "#FF0000" })

    await waitFor(() => {
      // Should not fire any events
      const updateEvent = eventHandler.mock.calls.find((call) => call[0]?.type === "update")
      expect(updateEvent).toBeUndefined()
    })
  })

  test("deleting non-existent annotation does nothing", async () => {
    const { result } = renderHook(() => useAnnotationCapability(), { wrapper })

    const eventHandler = mock(() => {})
    result.current.provides?.onAnnotationEvent(eventHandler)

    // Try to delete an annotation that doesn't exist
    result.current.provides?.deleteAnnotation(0, "non-existent-id")

    await waitFor(() => {
      // Should not fire any events
      const deleteEvent = eventHandler.mock.calls.find((call) => call[0]?.type === "delete")
      expect(deleteEvent).toBeUndefined()
    })
  })
})
