import { EventControlOptions } from "./event-control"

export type Listener<T = any> = (value: T) => void
export type Unsubscribe = () => void
export type EventListener<T> =
  | ((listener: Listener<T>) => Unsubscribe)
  | ((listener: Listener<T>, options?: EventControlOptions) => Unsubscribe)
export type EventHook<T = any> = EventListener<T>
export interface Emitter<T = any> {
  emit(value?: T): void
  on(listener: Listener<T>): Unsubscribe
  off(listener: Listener<T>): void
  clear(): void
}
export declare function createEmitter<T = any>(): Emitter<T>
export interface BehaviorEmitter<T = any> extends Omit<Emitter<T>, "on" | "off"> {
  readonly value?: T
  on: EventHook<T>
  off(listener: Listener<T>): void
  select<U>(selector: (v: T) => U, equality?: (a: U, b: U) => boolean): EventHook<U>
}
export declare function createBehaviorEmitter<T = any>(
  initial?: T,
  equality?: (a: T, b: T) => boolean,
): BehaviorEmitter<T>
