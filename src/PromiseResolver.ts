import { AbortError, Resolver, TimeoutError } from './index.ts'
import { wait } from './utils.ts'
import { setContext } from './context.ts'
import { Spawn } from './types.ts'

export interface PromiseResolverOptions<I = any, O = any> {
  fn: Resolver<I, O>
  abort: () => void
  retry?: number
  timeout?: number
  delay?: number
}

export interface PromiseResolverProps<I = any, O = any> {
  input: I
  spawn: Spawn<I, O>
  signal: AbortSignal
}

enum PromiseResolverState {
  WAITING,
  RUNNING,
  COMPLETED,
}

export class PromiseResolver<I = any, O = any> {
  readonly promise: Promise<O>
  #options: PromiseResolverOptions<I, O>
  #props: PromiseResolverProps<I, O>
  #_resolve!: (result: O) => void
  #_reject!: (error: Error) => void
  #state: PromiseResolverState = PromiseResolverState.WAITING
  #delayed: number = 0
  #attempts: number = 1
  #children: PromiseResolver[] = []

  constructor(
    props: PromiseResolverProps,
    options: PromiseResolverOptions,
  ) {
    this.#props = props
    this.#attempts = options?.retry || 1
    this.#options = options
    this.promise = new Promise((resolve, reject) => {
      this.#_resolve = resolve
      this.#_reject = reject
    })

    this.promise.finally(() => {
      this.#setState(PromiseResolverState.COMPLETED)
    })
  }

  #setState(state: PromiseResolverState) {
    this.#state = state
  }

  isRunning() {
    return this.#state === PromiseResolverState.RUNNING
  }

  isCompleted() {
    return this.#state === PromiseResolverState.COMPLETED
  }

  get children(): PromiseResolver[] {
    return this.#children
  }

  get delayed() {
    return this.#delayed
  }

  get runnable(): number {
    if (this.isRunning()) {
      return Infinity
    }

    if(this.delayed) {
      return this.#state === PromiseResolverState.WAITING ? this.delayed : Infinity
    }
    return this.#state === PromiseResolverState.WAITING ? 0 : Infinity
  }

  #setContext() {
    const { abort } = this.#options
    const { spawn, signal } = this.#props
    setContext({
      signal,
      abort,
      spawn
    })
  }

  #baseFn(): Promise<O> {
    if(!this.#options.timeout) {
      this.#setContext()
      return this.#options.fn(this.#props.input)
    }

    const controller = new AbortController()
    this.#props.signal.addEventListener('abort', controller.abort)

    this.#setContext()
    return Promise
      .race([
        wait(this.#options.timeout).then(() => {
          controller.abort()
          console.log('timeout')
          throw new TimeoutError()
        }),
        this.#options.fn(this.#props.input)
      ])
      .finally(() => {
        console.log('race end')
        this.#props.signal.removeEventListener('abort', controller.abort)
      })
  }

  #resolve() {
    return this.#baseFn()
      .then(res => {
        this.#setState(PromiseResolverState.COMPLETED)
        this.#_resolve(res)
      })
      .catch(async err => {
        console.log('catch', err)

        if(this.#attempts <= 0 || err instanceof AbortError) {
          this.#options.abort()
          throw err
        }
        this.#attempts--

        if (this.#options.delay) {
          this.#delayed = Date.now() + this.#options.delay
        }
      })
      .catch(this.#_reject)
  }

  async run() {
    this.#setState(PromiseResolverState.RUNNING)
    await this.#resolve()
    if (this.#state === PromiseResolverState.COMPLETED) {
      return
    }
    this.#setState(PromiseResolverState.WAITING)
  }
}
