import { wait } from './utils.ts'
import { AbortError, Resolver, TimeoutError } from './types.ts'

export interface PromiseResolverOptions {
  retry?: number
  timeout?: number
  delay?: number
}

export class PromiseResolver<I = any, O = any> extends AbortController {
  readonly input: I
  readonly fn: Resolver<I, O>
  readonly #options: PromiseResolverOptions
  #running = false
  #readAt: number = 0
  #attempts: number = 0
  #promiseWithResolvers: PromiseWithResolvers<O>

  constructor(
    input: I,
    fn: Resolver<I, O>,
    options: PromiseResolverOptions,
  ) {
    super()

    this.input = input
    this.fn = fn
    this.#promiseWithResolvers = Promise.withResolvers()
    this.#options = options
  }

  get availability() {
    if (this.#running) {
      return Infinity
    }

    return this.#readAt
  }

  get promise() {
    return this.#promiseWithResolvers.promise
  }

  #callFn(): Promise<O> {
    if (!this.#options.timeout) {
      return this.fn(this.input, this.signal)
    }

    return Promise
      .race([
        wait(this.#options.timeout).then(() => {
          this.abort()
          throw new TimeoutError()
        }),
        this.fn(this.input, this.signal)
      ])
  }

  async execute() {
    this.#attempts++
    this.#running = true
    return this.#callFn()
      .then(res => {
        this.#promiseWithResolvers.resolve(res)
        return true
      })
      .catch(async err => {
        if (!this.#options.retry || this.#attempts > this.#options.retry || err instanceof AbortError) {
          this.abort()
          throw err
        }
        this.#attempts--

        if (this.#options.delay) {
          this.#readAt = Date.now() + this.#options.delay
        }
        this.#running = false
        return false
      })
      .catch(this.#promiseWithResolvers.reject)
  }
}
