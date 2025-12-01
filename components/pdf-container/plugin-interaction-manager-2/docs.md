# Plugin Interaction Manager (plugin‑interaction‑manager‑2)

The **Interaction Manager** is the central nervous system for pointer events in the PDF viewer. Instead of each plugin (annotation, selection, etc.) adding its own event listeners and fighting for control, they register their *intent* with this manager.

## 1. Purpose

The plugin's main purpose is to **arbitrate user interactions**. It ensures that only one "mode" is active at a time (e.g., you can't select text while drawing a rectangle) and routes pointer events (`down`, `move`, `up`) to the correct handler based on the active mode. It also manages the global cursor state.

## 2. Capability Functions

The `InteractionManagerCapability` exposes these functions to other plugins:

### Mode Management

- `registerMode(mode)`: Define a new interaction mode (e.g., "draw‑highlight").
- `activate(modeId)`: Switch the application to a specific mode.
- `activateDefaultMode()`: Revert to the default mode (usually "pointerMode").
- `getActiveMode()`: Get the ID of the currently active mode.
- `getActiveInteractionMode()`: Get the full configuration object of the active mode.
- `setDefaultMode(id)`: Change what "default" means (e.g., switching from "view" to "edit" as base state).

### Event Handling

- `registerHandlers(options)`: Register `onPointerDown/Move/Up` functions that **only** run when a specific mode is active.
- `registerAlways(options)`: Register handlers that **always** run (e.g., hover effects that should work regardless of the tool).
- `getHandlersForScope(scope)`: Used by the UI components to get the merged list of functions to run for a specific page or globally.

### Cursor Management

- `setCursor(token, cursor, priority)`: Request a specific CSS cursor (e.g., "crosshair"). Uses a priority system so "drawing" overrides "hover".
- `removeCursor(token)`: Release a cursor claim.
- `getCurrentCursor()`: Get the currently winning cursor.

### State & Events

- `onModeChange`, `onCursorChange`, `onHandlerChange`, `onStateChange`: Subscribe to changes.
- `pause()`, `resume()`, `isPaused()`: Temporarily disable all interactions.
- `activeModeIsExclusive()`: Check if the current mode blocks other interactions (like an overlay).

### Exclusion Rules

- `addExclusionClass`, `addExclusionAttribute`: Tell the manager to ignore events starting on specific DOM elements (e.g., "don't draw if clicking on a button").

---

## 3. Actions

These Redux‑style actions are dispatched internally to update the plugin's state:

- `activateMode`: Updates `state.activeMode`.
- `setCursor`: Updates `state.cursor`.
- `setDefaultMode`: Updates `state.defaultMode`.
- `pauseInteraction` / `resumeInteraction`: Toggles `state.paused`.
- `setExclusionRules` / `addExclusion…`: Updates the list of ignored DOM elements.

---

## 4. Components

The plugin provides React components to bind its logic to the DOM:

- **`GlobalPointerProvider`** – Wraps the entire viewer. Handles events that happen anywhere (or outside pages) and delegates them to "global" handlers.
- **`PagePointerProvider`** – Wraps each individual PDF page. Handles events specific to a page (converting screen coordinates to PDF page coordinates) and delegates them to "page" handlers.

---

## 5. Integration with Consumers

### Adds to `plugin‑annotation‑2`

- **Tool Switching**: The annotation plugin registers a separate **mode** for each tool (e.g., `ink-tool`, `highlight-tool`).
- **Clean Logic**: The annotation plugin doesn't need `if (activeTool === 'ink')` checks inside its event listeners. It simply registers handlers for the `ink-tool` mode, and the Interaction Manager ensures they only run when that tool is active.
- **Exclusive Interaction**: It allows tools to be "exclusive" (blocking other interactions) or allow "text selection" underneath.

### Adds to `plugin‑selection‑2`

- **Coexistence**: The selection plugin registers its handlers using `registerAlways` (or specific modes), allowing text selection to work in parallel with other non‑exclusive modes (like `pointerMode`).
- **Cursor Control**: It uses `setCursor` to show the "text" cursor when hovering over text, which the Interaction Manager prioritizes correctly against other plugins.
- **Conditional Enabling**: It allows the annotation plugin to say "enable text selection even while the Highlight tool is active" via `enableForMode`.

## 6. Findings

### Modes Used by Consumers

- **Selection Plugin (`plugin-selection-2`)** operates primarily in the built‑in `pointerMode`.
- **Annotation Plugin (`plugin-annotation-2`)** registers a mode for each annotation tool defined in `initial-tools.ts`. The concrete mode IDs are the tool IDs:
  - `highlight`
  - `underline`
  - `squiggly`
  - `strikeout`
  - (future tools may not be added)

### `enableForMode` and `isEnabledForMode` (Selection Plugin)

- `enableForMode(modeId: string)` – called by the Annotation Plugin during initialization for any tool whose `interaction.textSelection` flag is `true`. It adds the given `modeId` to the `enabledModes` set, allowing the Selection Plugin to stay active while that mode is active.
- `isEnabledForMode(modeId: string): boolean` – checks whether a mode ID is present in `enabledModes`. The Selection Plugin’s pointer handlers guard their logic with this check, ensuring they only react when the mode is enabled.

### Where Annotation Modes Are Set

- **`initial-tools.ts`** defines each tool’s `id` and its `interaction.mode` (which defaults to the same string). These IDs become the mode IDs registered with the Interaction Manager.
- **`plugin-annotation-2/lib/plugin.ts`** (in `initialize`) iterates over `this.state.tools` and calls `this.interactionManager?.registerMode({ id: tool.interaction.mode ?? tool.id, ... })`. It also calls `this.selection?.enableForMode(tool.interaction.mode ?? tool.id)` for tools that have `textSelection: true`.
