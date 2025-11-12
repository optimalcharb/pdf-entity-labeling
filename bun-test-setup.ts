import "@testing-library/jest-dom"
import { JSDOM } from "jsdom"

// Create a new JSDOM instance
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true,
})

// Set up global variables for the test environment
global.window = dom.window as unknown as Window & typeof globalThis
global.document = dom.window.document
global.navigator = dom.window.navigator
global.HTMLElement = dom.window.HTMLElement
global.Element = dom.window.Element

// Suppress jsdom navigation warnings
const originalConsoleError = console.error
console.error = (...args: any[]) => {
  const message = args[0]?.toString?.() || args[0]
  if (message?.includes?.("navigation to another Document")) {
    return
  }
  originalConsoleError(...args)
}
const originalConsoleWarn = console.warn
console.warn = (...args: any[]) => {
  const message = args[0]?.toString?.() || args[0]
  if (message?.includes?.("navigation to another Document")) {
    return
  }
  originalConsoleWarn(...args)
}
