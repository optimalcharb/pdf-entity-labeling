import { PdfErrorCode } from "./pdf"

export enum TaskStage {
  Pending = 0,
  Resolved = 1,
  Rejected = 2,
  Aborted = 3,
}

export interface TaskError<D> {
  type: "reject" | "abort"
  reason: D
}

export interface PdfErrorReason {
  code: PdfErrorCode
  message: string
}
export type PdfEngineError = TaskError<PdfErrorReason>

export type ResolvedCallback<R> = (r: R) => void
export type RejectedCallback<D> = (e: TaskError<D>) => void
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

export class TaskAbortedError<D> extends Error {
  readonly reason: D
  constructor(reason: D) {
    super(`Task aborted: ${JSON.stringify(reason)}`)
    this.name = "TaskAbortedError"
    this.reason = reason
  }
}

export class TaskRejectedError<D> extends Error {
  readonly reason: D
  constructor(reason: D) {
    super(`Task rejected: ${JSON.stringify(reason)}`)
    this.name = "TaskRejectedError"
    this.reason = reason
  }
}

export class Task<R, D, P = unknown> {
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
  private _promise: Promise<R> | null
  /**
   * callbacks that will be executed when task is progressing
   */
  private progressCbs: ProgressCallback<P>[]

  constructor() {
    this.state = {
      stage: TaskStage.Pending,
    }
    this.resolvedCallbacks = []
    this.rejectedCallbacks = []
    this._promise = null
    this.progressCbs = []
  }

  /**
   * Convert task to promise
   * @returns promise that will be resolved when task is settled
   */
  toPromise(): Promise<R> {
    if (!this._promise) {
      this._promise = new Promise<R>((resolve, reject) => {
        this.wait(
          (result) => resolve(result),
          (error) => {
            if (error.type === "abort") {
              reject(new TaskAbortedError(error.reason))
            } else {
              reject(new TaskRejectedError(error.reason))
            }
          },
        )
      })
    }
    return this._promise
  }

  /**
   * wait for task to be settled
   * @param resolvedCallback - callback for resolved value
   * @param rejectedCallback - callback for rejected value
   */
  wait(resolvedCallback: ResolvedCallback<R>, rejectedCallback: RejectedCallback<D>): void {
    switch (this.state.stage) {
      case TaskStage.Pending:
        this.resolvedCallbacks.push(resolvedCallback)
        this.rejectedCallbacks.push(rejectedCallback)
        break
      case TaskStage.Resolved:
        if ("result" in this.state) {
          resolvedCallback(this.state.result)
        }
        break
      case TaskStage.Rejected:
        rejectedCallback({
          type: "reject",
          reason: this.state.reason,
        })
        break
      case TaskStage.Aborted:
        rejectedCallback({
          type: "abort",
          reason: this.state.reason,
        })
        break
    }
  }

  /**
   * resolve task with specific result
   * @param result - result value
   */
  resolve(result: R): void {
    if (this.state.stage === TaskStage.Pending) {
      this.state = {
        stage: TaskStage.Resolved,
        result,
      }
      for (const resolvedCallback of this.resolvedCallbacks) {
        try {
          resolvedCallback(result)
        } catch (e) {
          // Silently catch errors in callbacks
        }
      }
      this.resolvedCallbacks = []
      this.rejectedCallbacks = []
    }
  }

  /**
   * reject task with specific reason
   * @param reason - abort reason
   *
   */
  reject(reason: D): void {
    if (this.state.stage === TaskStage.Pending) {
      this.state = {
        stage: TaskStage.Rejected,
        reason,
      }
      for (const rejectedCallback of this.rejectedCallbacks) {
        try {
          rejectedCallback({
            type: "reject",
            reason,
          })
        } catch (e) {
          // Silently catch errors in callbacks
        }
      }
      this.resolvedCallbacks = []
      this.rejectedCallbacks = []
    }
  }

  /**
   * abort task with specific reason
   * @param reason - abort reason
   */
  abort(reason: D): void {
    if (this.state.stage === TaskStage.Pending) {
      this.state = {
        stage: TaskStage.Aborted,
        reason,
      }
      for (const rejectedCallback of this.rejectedCallbacks) {
        try {
          rejectedCallback({
            type: "abort",
            reason,
          })
        } catch (e) {
          // Silently catch errors in callbacks
        }
      }
      this.resolvedCallbacks = []
      this.rejectedCallbacks = []
    }
  }

  /**
   * fail task with a TaskError from another task
   * This is a convenience method for error propagation between tasks
   * @param error - TaskError from another task
   */
  fail(error: TaskError<D>): void {
    if (error.type === "abort") {
      this.abort(error.reason)
    } else {
      this.reject(error.reason)
    }
  }

  /**
   * add a progress callback
   * @param cb - progress callback
   */
  onProgress(cb: ProgressCallback<P>): void {
    this.progressCbs.push(cb)
  }

  /**
   * call progress callback
   * @param p - progress value
   */
  progress(p: P): void {
    for (const cb of this.progressCbs) {
      cb(p)
    }
  }

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
  > {
    const combinedTask = new Task<
      {
        [K in keyof R]: R[K] extends Task<infer U, any> ? U : never
      },
      any
    >()

    if (tasks.length === 0) {
      combinedTask.resolve([] as any)
      return combinedTask
    }

    const results: any[] = new Array(tasks.length)
    let resolvedCount = 0
    let isSettled = false

    tasks.forEach((task, index) => {
      task.wait(
        (result) => {
          if (isSettled) return
          results[index] = result
          resolvedCount++
          if (resolvedCount === tasks.length) {
            isSettled = true
            combinedTask.resolve(results as any)
          }
        },
        (error) => {
          if (isSettled) return
          isSettled = true
          if (error.type === "abort") {
            combinedTask.abort(error.reason)
          } else {
            combinedTask.reject(error.reason)
          }
        },
      )
    })

    return combinedTask
  }

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
  > {
    const combinedTask = new Task<
      {
        [K in keyof R]: R[K] extends Task<infer U, infer E> ? TaskSettledResult<U, E> : never
      },
      never
    >()

    if (tasks.length === 0) {
      combinedTask.resolve([] as any)
      return combinedTask
    }

    const results: any[] = new Array(tasks.length)
    let settledCount = 0

    tasks.forEach((task, index) => {
      task.wait(
        (result) => {
          results[index] = { status: "resolved", value: result }
          settledCount++
          if (settledCount === tasks.length) {
            combinedTask.resolve(results as any)
          }
        },
        (error) => {
          results[index] = {
            status: error.type === "abort" ? "aborted" : "rejected",
            reason: error.reason,
          }
          settledCount++
          if (settledCount === tasks.length) {
            combinedTask.resolve(results as any)
          }
        },
      )
    })

    return combinedTask
  }

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
  > {
    const combinedTask = new Task<
      R[number] extends Task<infer U, any> ? U : never,
      R[number] extends Task<any, infer E> ? E : never
    >()

    if (tasks.length === 0) {
      combinedTask.reject("No tasks provided" as any)
      return combinedTask
    }

    let isSettled = false
    tasks.forEach((task) => {
      task.wait(
        (result) => {
          if (isSettled) return
          isSettled = true
          combinedTask.resolve(result)
        },
        (error) => {
          if (isSettled) return
          isSettled = true
          if (error.type === "abort") {
            combinedTask.abort(error.reason)
          } else {
            combinedTask.reject(error.reason)
          }
        },
      )
    })

    return combinedTask
  }

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
  > {
    const combinedTask = Task.all(tasks)

    if (onProgress) {
      let completedCount = 0
      tasks.forEach((task) => {
        task.wait(
          () => {
            completedCount++
            onProgress(completedCount, tasks.length)
          },
          () => {
            completedCount++
            onProgress(completedCount, tasks.length)
          },
        )
      })
    }

    return combinedTask
  }
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

export type PdfTask<R, P = unknown> = Task<R, PdfErrorReason, P>

export class PdfTaskHelper {
  /**
   * Create a new pending task
   * @returns new task
   */
  static create<R, P = unknown>(): Task<R, PdfErrorReason, P> {
    return new Task<R, PdfErrorReason, P>()
  }

  /**
   * Create a task that has been resolved with value
   * @param result - resolved value
   * @returns resolved task
   */
  static resolve<R, P = unknown>(result: R): Task<R, PdfErrorReason, P> {
    const task = new Task<R, PdfErrorReason, P>()
    task.resolve(result)
    return task
  }

  /**
   * Create a task that has been rejected with error
   * @param reason - rejected error
   * @returns rejected task
   */
  static reject<T = any, P = unknown>(reason: PdfErrorReason): Task<T, PdfErrorReason, P> {
    const task = new Task<T, PdfErrorReason, P>()
    task.reject(reason)
    return task
  }

  /**
   * Create a task that has been aborted with error
   * @param reason - aborted error
   * @returns aborted task
   */
  static abort<T = any, P = unknown>(reason: PdfErrorReason): Task<T, PdfErrorReason, P> {
    const task = new Task<T, PdfErrorReason, P>()
    task.reject(reason) // Assuming abort uses same internal rejection path
    return task
  }
}
