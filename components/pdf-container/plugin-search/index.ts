import { useEffect, useState } from "react"
import { jsx } from "react/jsx-runtime"
import {
  Action,
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  PdfTaskHelper,
  type PluginManifest,
  PluginPackage,
  PluginRegistry,
  type Rect,
  type Reducer,
  useCapability,
  usePlugin,
} from "../core"
import { LoaderCapability } from "../plugin-loader"

// *****CUSTOM TYPES*****
enum MatchFlag {
  None = 0,
  MatchCase = 1,
  MatchWholeWord = 2,
  MatchConsecutive = 4,
}

interface SearchResult {
  pageIndex: number
  charIndex: number
  charCount: number
  rects: Rect[]
  context: TextContext
}

interface SearchAllPagesResult {
  results: SearchResult[]
  total: number
}

/** Context of one hit */
interface TextContext {
  /** Complete words that come *before* the hit (no ellipsis)            */
  before: string
  /** Exactly the text that matched (case-preserved)                      */
  match: string
  /** Complete words that come *after* the hit (no ellipsis)             */
  after: string
  /** `true` ⇢ there were more words on the left that we cut off         */
  truncatedLeft: boolean
  /** `true` ⇢ there were more words on the right that we cut off        */
  truncatedRight: boolean
}

// *****PLUGIN ESSENTIALS******
// ***ID***
export const SEARCH_PLUGIN_ID = "search"

// ***STATE***
export interface SearchState {
  flags: MatchFlag[]
  results: SearchResult[]
  total: number
  activeResultIndex: number
  showAllResults: boolean
  query: string
  loading: boolean
  active: boolean
}

// ***INITIAL STATE***
const initialState: SearchState = {
  flags: [],
  results: [],
  total: 0,
  activeResultIndex: -1,
  showAllResults: true,
  query: "",
  loading: false,
  active: false,
}

// ***ACTION CONSTANTS***
const START_SEARCH_SESSION = "START_SEARCH_SESSION"
const STOP_SEARCH_SESSION = "STOP_SEARCH_SESSION"
const SET_SEARCH_FLAGS = "SET_SEARCH_FLAGS"
const SET_SHOW_ALL_RESULTS = "SET_SHOW_ALL_RESULTS"
const START_SEARCH = "START_SEARCH"
const SET_SEARCH_RESULTS = "SET_SEARCH_RESULTS"
const APPEND_SEARCH_RESULTS = "APPEND_SEARCH_RESULTS"
const SET_ACTIVE_RESULT_INDEX = "SET_ACTIVE_RESULT_INDEX"

// ***ACTION INTERFACES***
interface StartSearchSessionAction extends Action {
  type: typeof START_SEARCH_SESSION
}
interface StopSearchSessionAction extends Action {
  type: typeof STOP_SEARCH_SESSION
}
interface SetSearchFlagsAction extends Action {
  type: typeof SET_SEARCH_FLAGS
  payload: MatchFlag[]
}
interface SetShowAllResultsAction extends Action {
  type: typeof SET_SHOW_ALL_RESULTS
  payload: boolean
}
interface StartSearchAction extends Action {
  type: typeof START_SEARCH
  payload: string
}
interface SetSearchResultsAction extends Action {
  type: typeof SET_SEARCH_RESULTS
  payload: {
    results: SearchResult[]
    total: number
    activeResultIndex: number
  }
}
interface AppendSearchResultsAction extends Action {
  type: typeof APPEND_SEARCH_RESULTS
  payload: {
    results: SearchResult[]
  }
}
interface SetActiveResultIndexAction extends Action {
  type: typeof SET_ACTIVE_RESULT_INDEX
  payload: number
}

// ***ACTION UNION***
export type SearchAction =
  | StartSearchSessionAction
  | StopSearchSessionAction
  | SetSearchFlagsAction
  | SetShowAllResultsAction
  | StartSearchAction
  | SetSearchResultsAction
  | AppendSearchResultsAction
  | SetActiveResultIndexAction

// ***ACTION CREATORS***
const startSearchSession = (): StartSearchSessionAction => ({
  type: START_SEARCH_SESSION,
})
const stopSearchSession = (): StopSearchSessionAction => ({
  type: STOP_SEARCH_SESSION,
})
const setSearchFlags = (flags: MatchFlag[]): SetSearchFlagsAction => ({
  type: SET_SEARCH_FLAGS,
  payload: flags,
})
const setShowAllResults = (showAll: boolean): SetShowAllResultsAction => ({
  type: SET_SHOW_ALL_RESULTS,
  payload: showAll,
})
const startSearch = (query: string): StartSearchAction => ({
  type: START_SEARCH,
  payload: query,
})
const setSearchResults = (
  results: SearchResult[],
  total: number,
  activeResultIndex: number,
): SetSearchResultsAction => ({
  type: SET_SEARCH_RESULTS,
  payload: { results, total, activeResultIndex },
})
const appendSearchResults = (results: SearchResult[]): AppendSearchResultsAction => ({
  type: APPEND_SEARCH_RESULTS,
  payload: { results },
})
const setActiveResultIndex = (index: number): SetActiveResultIndexAction => ({
  type: SET_ACTIVE_RESULT_INDEX,
  payload: index,
})

// ***ACTION REDUCER***
const searchReducer: Reducer<SearchState, SearchAction> = (state = initialState, action) => {
  switch (action.type) {
    case START_SEARCH_SESSION:
      return { ...state, active: true }
    case STOP_SEARCH_SESSION:
      return {
        ...state,
        results: [],
        total: 0,
        activeResultIndex: -1,
        query: "",
        loading: false,
        active: false,
      }
    case SET_SEARCH_FLAGS:
      return { ...state, flags: action.payload }
    case SET_SHOW_ALL_RESULTS:
      return { ...state, showAllResults: action.payload }
    case START_SEARCH:
      return {
        ...state,
        loading: true,
        query: action.payload,
        // clear old results on new search start
        results: [],
        total: 0,
        activeResultIndex: -1,
      }
    case APPEND_SEARCH_RESULTS: {
      const newResults = [...state.results, ...action.payload.results]
      const firstHitIndex =
        state.activeResultIndex === -1 && newResults.length > 0 ? 0 : state.activeResultIndex
      return {
        ...state,
        results: newResults,
        total: newResults.length,
        // total-so-far
        activeResultIndex: firstHitIndex,
        // keep loading true until final SET_SEARCH_RESULTS
        loading: true,
      }
    }
    case SET_SEARCH_RESULTS:
      return {
        ...state,
        results: action.payload.results,
        total: action.payload.total,
        activeResultIndex: action.payload.activeResultIndex,
        loading: false,
      }
    case SET_ACTIVE_RESULT_INDEX:
      return { ...state, activeResultIndex: action.payload }
    default:
      return state
  }
}

// ***PLUGIN CAPABILITY***
export interface SearchCapability {
  startSearch: () => void
  stopSearch: () => void
  searchAllPages: (keyword: string) => any
  nextResult: () => number
  previousResult: () => number
  goToResult: (index: number) => number
  setShowAllResults: (showAll: boolean) => void
  getShowAllResults: () => boolean
  onSearchResult: (handler: (result: SearchAllPagesResult) => void) => () => void
  onSearchStart: (handler: () => void) => () => void
  onSearchStop: (handler: () => void) => () => void
  onActiveResultChange: (handler: (index: number) => void) => () => void
  onSearchResultStateChange: (handler: (state: any) => void) => () => void
  getFlags: () => MatchFlag[]
  setFlags: (flags: MatchFlag[]) => void
  onStateChange: (handler: (state: SearchState) => void) => () => void
  getState: () => SearchState
}

// ***PLUGIN CONFIG***
export interface SearchPluginConfig extends BasePluginConfig {
  flags?: MatchFlag[]
  showAllResults?: boolean
}
// ***PLUGIN CLASS***
export class SearchPlugin extends BasePlugin<
  SearchPluginConfig,
  SearchCapability,
  SearchState,
  SearchAction
> {
  static readonly id: string = SEARCH_PLUGIN_ID

  private loader: LoaderCapability | null
  private currentDocument?: any
  private readonly searchStop$ = createBehaviorEmitter()
  private readonly searchStart$ = createBehaviorEmitter()
  private readonly searchResult$ = createBehaviorEmitter()
  private readonly searchActiveResultChange$ = createBehaviorEmitter()
  private readonly searchResultState$ = createBehaviorEmitter()
  private readonly searchState$ = createBehaviorEmitter()
  private currentTask?: any

  constructor(id: string, registry: PluginRegistry) {
    super(id, registry)
    const loaderPlugin = this.registry.getPlugin("loader")
    if (loaderPlugin && loaderPlugin.provides) {
      this.loader = loaderPlugin.provides()
      if (this.loader) {
        this.loader.onDocumentLoaded(this.handleDocumentLoaded.bind(this))
        this.loader.onLoaderEvent(this.handleLoaderEvent.bind(this))
      }
    } else {
      this.loader = null
    }
  }

  private handleDocumentLoaded(doc: any) {
    this.currentDocument = doc
    if (this.state.active) {
      this.startSearchSession()
    }
  }

  private handleLoaderEvent(event: any) {
    if (event.type === "error" || (event.type === "start" && this.currentDocument)) {
      if (this.state.active) {
        this.stopSearchSession()
      }
      this.currentDocument = void 0
    }
  }

  async initialize(config: SearchPluginConfig) {
    this.dispatch(setSearchFlags(config.flags || []))
    this.dispatch(
      setShowAllResults(config.showAllResults !== void 0 ? config.showAllResults : true),
    )
  }

  onStoreUpdated(_prevState: SearchState, newState: SearchState) {
    this.searchResultState$.emit({
      results: newState.results,
      activeResultIndex: newState.activeResultIndex,
      showAllResults: newState.showAllResults,
      active: newState.active,
    })
    this.searchState$.emit(newState)
  }

  // capability functions to enable the client program to...
  buildCapability(): SearchCapability {
    return {
      startSearch: this.startSearchSession.bind(this),
      stopSearch: this.stopSearchSession.bind(this),
      searchAllPages: this.searchAllPages.bind(this),
      nextResult: this.nextResult.bind(this),
      previousResult: this.previousResult.bind(this),
      goToResult: this.goToResult.bind(this),
      setShowAllResults: (showAll: boolean) => this.dispatch(setShowAllResults(showAll)),
      getShowAllResults: () => this.state.showAllResults,
      onSearchResult: this.searchResult$.on,
      onSearchStart: this.searchStart$.on,
      onSearchStop: this.searchStop$.on,
      onActiveResultChange: this.searchActiveResultChange$.on,
      onSearchResultStateChange: this.searchResultState$.on,
      onStateChange: this.searchState$.on,
      getFlags: () => this.state.flags,
      setFlags: (flags: MatchFlag[]) => this.setFlags(flags),
      getState: () => this.state,
    }
  }

  private setFlags(flags: MatchFlag[]) {
    this.dispatch(setSearchFlags(flags))
    if (this.state.active) {
      this.searchAllPages(this.state.query, true)
    }
  }

  private notifySearchStart() {
    this.searchStart$.emit()
  }

  private notifySearchStop() {
    this.searchStop$.emit()
  }

  private notifyActiveResultChange(index: number) {
    this.searchActiveResultChange$.emit(index)
  }

  private startSearchSession() {
    if (!this.currentDocument) return
    this.dispatch(startSearchSession())
    this.notifySearchStart()
  }

  private stopSearchSession() {
    var _a, _b
    if (!this.currentDocument || !this.state.active) return
    try {
      ;(_b = (_a = this.currentTask) == null ? void 0 : _a.abort) == null
        ? void 0
        : _b.call(_a, {
            type: "abort",
            code: "cancelled",
            message: "search stopped",
          })
    } catch {}
    this.currentTask = void 0
    this.dispatch(stopSearchSession())
    this.notifySearchStop()
  }

  private searchAllPages(keyword: string, force = false): any {
    var _a, _b
    const trimmedKeyword = keyword.trim()
    if (this.state.query === trimmedKeyword && !force) {
      return PdfTaskHelper.resolve({
        results: this.state.results,
        total: this.state.total,
      })
    }
    if (this.currentTask) {
      try {
        ;(_b = (_a = this.currentTask).abort) == null
          ? void 0
          : _b.call(_a, {
              type: "abort",
              code: "superseded",
              message: "new search",
            })
      } catch {}
      this.currentTask = void 0
    }
    this.dispatch(startSearch(trimmedKeyword))
    if (!trimmedKeyword || !this.currentDocument) {
      this.dispatch(setSearchResults([], 0, -1))
      return PdfTaskHelper.resolve({
        results: [],
        total: 0,
      })
    }
    if (!this.state.active) {
      this.startSearchSession()
    }
    const task = (this.currentTask = this.engine.searchAllPages(
      this.currentDocument,
      trimmedKeyword,
      {
        flags: this.state.flags,
      },
    ))
    task.onProgress((p: any) => {
      var _a2
      if ((_a2 = p == null ? void 0 : p.results) == null ? void 0 : _a2.length) {
        this.dispatch(appendSearchResults(p.results))
        if (this.state.activeResultIndex === -1) {
          this.dispatch(setActiveResultIndex(0))
          this.notifyActiveResultChange(0)
        }
      }
    })
    task.wait(
      (results: any) => {
        this.currentTask = void 0
        const activeResultIndex = results.total > 0 ? 0 : -1
        this.dispatch(setSearchResults(results.results, results.total, activeResultIndex))
        this.searchResult$.emit(results)
        if (results.total > 0) {
          this.notifyActiveResultChange(0)
        }
      },
      (error: any) => {
        this.currentTask = void 0
        console.error("Error during search:", error)
        this.dispatch(setSearchResults([], 0, -1))
      },
    )
    return task
  }

  private nextResult() {
    if (this.state.results.length === 0) return -1
    const nextIndex =
      this.state.activeResultIndex >= this.state.results.length - 1
        ? 0
        : this.state.activeResultIndex + 1
    return this.goToResult(nextIndex)
  }

  private previousResult() {
    if (this.state.results.length === 0) return -1
    const prevIndex =
      this.state.activeResultIndex <= 0
        ? this.state.results.length - 1
        : this.state.activeResultIndex - 1
    return this.goToResult(prevIndex)
  }

  private goToResult(index: number) {
    if (this.state.results.length === 0 || index < 0 || index >= this.state.results.length) {
      return -1
    }
    this.dispatch(setActiveResultIndex(index))
    this.notifyActiveResultChange(index)
    return index
  }

  async destroy() {
    if (this.state.active && this.currentDocument) {
      this.stopSearchSession()
    }
    this.searchResult$.clear()
    this.searchStart$.clear()
    this.searchStop$.clear()
    this.searchActiveResultChange$.clear()
    this.searchResultState$.clear()
    this.searchState$.clear()
  }
}

// ***MANIFEST***
const manifest: PluginManifest<SearchPluginConfig> = {
  id: SEARCH_PLUGIN_ID,
  name: "Search Plugin",
  version: "1.0.0",
  provides: [SEARCH_PLUGIN_ID],
  requires: ["loader"],
  optional: [],
  defaultConfig: {
    enabled: true,
    flags: [],
  },
}

// **PLUGIN PACKAGE***
export const SearchPluginPackage: PluginPackage<
  SearchPlugin,
  SearchPluginConfig,
  SearchState,
  SearchAction
> = {
  manifest,
  create: (registry: PluginRegistry) => new SearchPlugin(SEARCH_PLUGIN_ID, registry),
  reducer: searchReducer,
  initialState,
}

// ***PLUGIN HOOKS***
export const useSearchPlugin = () => usePlugin(SEARCH_PLUGIN_ID)
export const useSearchCapability = () => useCapability(SEARCH_PLUGIN_ID)

// *****COMPONENTS******
interface SearchLayerProps {
  pageIndex: number
  scale: number
  highlightColor?: string
  activeHighlightColor?: string
  style?: any
  [key: string]: any
}

export function SearchLayer({
  pageIndex,
  scale,
  style,
  highlightColor = "#FFFF00",
  activeHighlightColor = "#FFBF00",
  ...props
}: SearchLayerProps) {
  const { provides: searchProvides } = useSearchCapability()
  const [searchResultState, setSearchResultState] = useState<{
    results: SearchResult[]
    activeResultIndex: number
    showAllResults: boolean
    active: boolean
  } | null>(null)

  useEffect(() => {
    return (searchProvides as any)?.onSearchResultStateChange(
      (state: {
        results: SearchResult[]
        activeResultIndex: number
        showAllResults: boolean
        active: boolean
      }) => {
        setSearchResultState(state)
      },
    )
  }, [searchProvides])

  if (!searchResultState) {
    return null
  }

  const pageResults = searchResultState.results
    .map((result: SearchResult, originalIndex: number) => ({
      result,
      originalIndex,
    }))
    .filter(({ result }: { result: SearchResult }) => result.pageIndex === pageIndex)

  return /* @__PURE__ */ jsx("div", {
    style: {
      ...style,
    },
    ...props,
    children: pageResults.map(
      ({ result, originalIndex }: { result: SearchResult; originalIndex: number }) =>
        result.rects.map((rect: any) =>
          /* @__PURE__ */ jsx("div", {
            style: {
              position: "absolute",
              top: rect.origin.y * scale,
              left: rect.origin.x * scale,
              width: rect.size.width * scale,
              height: rect.size.height * scale,
              backgroundColor:
                originalIndex === searchResultState.activeResultIndex
                  ? activeHighlightColor
                  : highlightColor,
              mixBlendMode: "multiply",
              transform: "scale(1.02)",
              transformOrigin: "center",
              transition: "opacity .3s ease-in-out",
              opacity: 1,
            },
          }),
        ),
    ),
  })
}

// *****CUSTOM HOOKS*****
export const useSearch = () => {
  const { provides } = useSearchCapability()
  const [searchState, setSearchState] = useState<SearchState>({
    flags: [],
    results: [],
    total: 0,
    activeResultIndex: -1,
    showAllResults: true,
    query: "",
    loading: false,
    active: false,
  })

  useEffect(() => {
    return (provides as any)?.onStateChange((state: SearchState) => setSearchState(state))
  }, [provides])

  return {
    state: searchState,
    provides,
  }
}
