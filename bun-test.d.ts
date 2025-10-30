declare module "bun:test" {
  export interface TestContext {
    skip(): void
    todo(): void
    only(): void
  }

  export interface Matchers<R = void> {
    toBe(expected: any): R
    toEqual(expected: any): R
    toBeCloseTo(expected: number, numDigits?: number): R
    toBeDefined(): R
    toBeUndefined(): R
    toBeNull(): R
    toBeTruthy(): R
    toBeFalsy(): R
    toBeNaN(): R
    toBeGreaterThan(expected: number): R
    toBeGreaterThanOrEqual(expected: number): R
    toBeLessThan(expected: number): R
    toBeLessThanOrEqual(expected: number): R
    toContain(expected: any): R
    toContainEqual(expected: any): R
    toHaveLength(expected: number): R
    toHaveProperty(keyPath: string | string[], value?: any): R
    toMatch(expected: string | RegExp): R
    toMatchObject(expected: object): R
    toStrictEqual(expected: any): R
    toThrow(expected?: string | RegExp | Error): R
    toThrowError(expected?: string | RegExp | Error): R
    toBeInstanceOf(expected: any): R

    // jest-dom matchers
    toBeInTheDocument(): R
    toBeVisible(): R
    toBeEmpty(): R
    toBeDisabled(): R
    toBeEnabled(): R
    toBeInvalid(): R
    toBeRequired(): R
    toBeValid(): R
    toContainElement(element: HTMLElement | null): R
    toContainHTML(html: string): R
    toHaveAccessibleDescription(description?: string | RegExp): R
    toHaveAccessibleName(name?: string | RegExp): R
    toHaveAttribute(attr: string, value?: string | RegExp): R
    toHaveClass(...classNames: string[]): R
    toHaveFocus(): R
    toHaveFormValues(values: Record<string, any>): R
    toHaveStyle(css: string | Record<string, any>): R
    toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): R
    toHaveValue(value: string | string[] | number): R
    toHaveDisplayValue(value: string | RegExp | Array<string | RegExp>): R
    toBeChecked(): R
    toBePartiallyChecked(): R
    toHaveErrorMessage(message?: string | RegExp): R

    not: Matchers<R>
  }

  export interface Expect {
    <T = any>(actual: T): Matchers<void>
    extend(matchers: Record<string, any>): void
  }

  export const expect: Expect

  export type TestFunction = (context?: TestContext) => void | Promise<void>

  export function test(name: string, fn: TestFunction): void
  export function test(name: string, timeout: number, fn: TestFunction): void

  export namespace test {
    function skip(name: string, fn: TestFunction): void
    function todo(name: string, fn?: TestFunction): void
    function only(name: string, fn: TestFunction): void
    function skipIf(condition: boolean): (name: string, fn: TestFunction) => void
  }

  export function describe(name: string, fn: () => void): void
  export namespace describe {
    function skip(name: string, fn: () => void): void
    function todo(name: string, fn?: () => void): void
    function only(name: string, fn: () => void): void
    function skipIf(condition: boolean): (name: string, fn: () => void) => void
  }

  export function beforeAll(fn: () => void | Promise<void>): void
  export function beforeEach(fn: () => void | Promise<void>): void
  export function afterAll(fn: () => void | Promise<void>): void
  export function afterEach(fn: () => void | Promise<void>): void

  export function mock<T extends (...args: any[]) => any>(
    fn?: T,
  ): T & {
    mock: {
      calls: any[][]
      results: { type: "return" | "throw"; value: any }[]
      instances: any[]
    }
    mockClear(): void
    mockReset(): void
    mockRestore(): void
    mockImplementation(fn: T): void
    mockImplementationOnce(fn: T): void
    mockReturnValue(value: any): void
    mockReturnValueOnce(value: any): void
    mockResolvedValue(value: any): void
    mockResolvedValueOnce(value: any): void
    mockRejectedValue(value: any): void
    mockRejectedValueOnce(value: any): void
  }

  export function spyOn<T extends object, K extends keyof T>(
    object: T,
    method: K,
  ): T[K] extends (...args: any[]) => any ? ReturnType<typeof mock<T[K]>> : never
}
