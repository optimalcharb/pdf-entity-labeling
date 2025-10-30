export declare enum TaskStage {
  Pending = 0,
  Resolved = 1,
  Rejected = 2,
  Aborted = 3,
}
export interface TaskError<D> {
  type: "reject" | "abort"
  reason: D
}
/**
 * callback that will be called when task is resolved
 *
 * @public
 */
export type ResolvedCallback<R> = (r: R) => void
/**
 * callback that will be called when task is rejected
 *
 * @public
 */
export type RejectedCallback<D> = (e: TaskError<D>) => void
/**
 * callback that will be called when task is progressing
 *
 * @public
 */
export type ProgressCallback<P> = (p: P) => void
export type TaskState<R, D> =
  | {
      stage: TaskStage.Pending
    }
  | {
      stage: TaskStage.Resolved
      result: R
    }
  | {
      stage: TaskStage.Rejected
      reason: D
    }
  | {
      stage: TaskStage.Aborted
      reason: D
    }
/**
 * Result type for allSettled
 *
 * @public
 */
export type TaskSettledResult<R, D> =
  | {
      status: "resolved"
      value: R
    }
  | {
      status: "rejected"
      reason: D
    }
  | {
      status: "aborted"
      reason: D
    }
export declare class TaskAbortedError<D> extends Error {
  readonly reason: D
  constructor(reason: D)
}
export declare class TaskRejectedError<D> extends Error {
  readonly reason: D
  constructor(reason: D)
}
export declare class Task<R, D, P = unknown> {
  state: TaskState<R, D>
  /**
   * callbacks that will be executed when task is resolved
   */
  resolvedCallbacks: ResolvedCallback<R>[]
  /**
   * callbacks that will be executed when task is rejected
   */
  rejectedCallbacks: RejectedCallback<D>[]
  /**
   * Promise that will be resolved when task is settled
   */
  private _promise
  /**
   * callbacks that will be executed when task is progressing
   */
  private progressCbs
  /**
   * Convert task to promise
   * @returns promise that will be resolved when task is settled
   */
  toPromise(): Promise<R>
  /**
   * wait for task to be settled
   * @param resolvedCallback - callback for resolved value
   * @param rejectedCallback - callback for rejected value
   */
  wait(resolvedCallback: ResolvedCallback<R>, rejectedCallback: RejectedCallback<D>): void
  /**
   * resolve task with specific result
   * @param result - result value
   */
  resolve(result: R): void
  /**
   * reject task with specific reason
   * @param reason - abort reason
   *
   */
  reject(reason: D): void
  /**
   * abort task with specific reason
   * @param reason - abort reason
   */
  abort(reason: D): void
  /**
   * fail task with a TaskError from another task
   * This is a convenience method for error propagation between tasks
   * @param error - TaskError from another task
   */
  fail(error: TaskError<D>): void
  /**
   * add a progress callback
   * @param cb - progress callback
   */
  onProgress(cb: ProgressCallback<P>): void
  /**
   * call progress callback
   * @param p - progress value
   */
  progress(p: P): void
  /**
   * Static method to wait for all tasks to resolve
   * Returns a new task that resolves with an array of all results
   * Rejects immediately if any task fails
   *
   * @param tasks - array of tasks to wait for
   * @returns new task that resolves when all input tasks resolve
   * @public
   */
  static all<R extends readonly Task<any, any>[]>(
    tasks: R,
  ): Task<
    {
      [K in keyof R]: R[K] extends Task<infer U, any> ? U : never
    },
    any
  >
  /**
   * Static method to wait for all tasks to settle (resolve, reject, or abort)
   * Always resolves with an array of settlement results
   *
   * @param tasks - array of tasks to wait for
   * @returns new task that resolves when all input tasks settle
   * @public
   */
  static allSettled<R extends readonly Task<any, any>[]>(
    tasks: R,
  ): Task<
    {
      [K in keyof R]: R[K] extends Task<infer U, infer E> ? TaskSettledResult<U, E> : never
    },
    never
  >
  /**
   * Static method that resolves/rejects with the first task that settles
   *
   * @param tasks - array of tasks to race
   * @returns new task that settles with the first input task that settles
   * @public
   */
  static race<R extends readonly Task<any, any>[]>(
    tasks: R,
  ): Task<
    R[number] extends Task<infer U, any> ? U : never,
    R[number] extends Task<any, infer E> ? E : never
  >
  /**
   * Utility to track progress of multiple tasks
   *
   * @param tasks - array of tasks to track
   * @param onProgress - callback called when any task completes
   * @returns new task that resolves when all input tasks resolve
   * @public
   */
  static withProgress<R extends readonly Task<any, any>[]>(
    tasks: R,
    onProgress?: (completed: number, total: number) => void,
  ): Task<
    {
      [K in keyof R]: R[K] extends Task<infer U, any> ? U : never
    },
    any
  >
}
export type TaskReturn<T extends Task<any, any>> =
  T extends Task<infer R, infer E>
    ?
        | {
            type: "result"
            value: R
          }
        | {
            type: "error"
            value: TaskError<E>
          }
    : never
