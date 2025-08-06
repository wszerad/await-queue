import { promiseWithResolvers, wait } from './utils.ts'
import { AbortError, Mapper, Resolver, TimeoutError } from './types.ts'

export interface PromiseResolverOptions {
  retry?: number
  timeout?: number
  delay?: number
}

export class PromiseResolver extends AbortController {
  readonly input: any
  readonly fn: Resolver
  readonly map: Mapper
  readonly #options: PromiseResolverOptions
  #running = false
  #readAt: number = 0
  #attempts: number = 0
  #promiseWithResolvers: PromiseWithResolvers<any>

  constructor(
    input: any,
    fn: Resolver,
    options: PromiseResolverOptions,
    map: Mapper,
  ) {
    super()

    this.input = input
    this.fn = fn
    this.map = map
    this.#promiseWithResolvers = promiseWithResolvers()
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

  #callFn(): Promise<any> {
    if (!this.#options.timeout) {
      return this.fn(this.input, this.signal).then(this.map)
    }

    return Promise
      .race([
        wait(this.#options.timeout).then(() => {
          this.abort()
          throw new TimeoutError()
        }),
        this.fn(this.input, this.signal)
      ])
      .then(this.map)
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
