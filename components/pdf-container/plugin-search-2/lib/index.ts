import { PluginPackage } from "@embedpdf/core"
import { SearchAction } from "./actions"
import { manifest, SEARCH_PLUGIN_ID } from "./manifest"
import { initialSearchDocumentState, initialState, searchReducer } from "./reducer"
import { SearchPlugin } from "./search-plugin"
import { SearchPluginConfig, SearchState } from "./types"

export const SearchPluginPackage: PluginPackage<
  SearchPlugin,
  SearchPluginConfig,
  SearchState,
  SearchAction
> = {
  manifest,
  create: (registry, config) => new SearchPlugin(SEARCH_PLUGIN_ID, registry, config),
  reducer: searchReducer,
  initialState,
}

export { SearchPlugin } from "./search-plugin"
export * from "./types"
export * from "./manifest"
export { initialState, initialSearchDocumentState }
