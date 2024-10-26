import { hash } from 'ohash'
import { PromiseResolver, PromiseResolverOptions } from './PromiseResolver.ts'
import { QueuePoll } from './QueuePoll.ts'

export type Resolver<I, O> = (job: I) => Promise<O>

export class TimeoutError extends Error {
  message = 'Timeout error'
}
export class AbortError extends Error {
  message = 'Abort error'
}

interface AsyncCollectorOptions extends Omit<PromiseResolverOptions, 'fn' | 'abort'> {
  concurrency?: number
  signal?: AbortSignal
}

export class AsyncResolver<I, O> {
  #matrix = new Map<string, PromiseResolver<any>>
  #pool: QueuePoll
  #resolverOptions: PromiseResolverOptions
  #abortController: AbortController

  constructor(
    resolver: Resolver<I, O>,
    options: AsyncCollectorOptions = {}
  ) {
    const abortController = this.#abortController = new AbortController()

    this.#pool = new QueuePoll({
      concurrency: options.concurrency || Infinity,
      signal: abortController.signal,
    })

    this.#resolverOptions = {
      ...options,
      abort: () => abortController.abort(),
      fn: resolver,
    }

    // TODO need clearing?
    options.signal?.addEventListener('abort', () => {
      abortController.abort()
    })
  }

  get size() {
    return this.#pool.size
  }

  get active() {
    return this.#pool.active
  }

  // get concurrency() {
  //   return this.#resolverOptions.concurrency || Infinity
  // }

  #getResolver(input: I, signal: AbortSignal): PromiseResolver {
    const inputHash = hash(input)
    let promiseResolver = this.#matrix.get(inputHash)

    if (!promiseResolver) {
      promiseResolver = new PromiseResolver(
        {
          input,
          signal,
          spawn: (input: I) => this.#spawn(input)
        },
        this.#resolverOptions,
      )
      this.#matrix.set(inputHash, promiseResolver)
    }

    return promiseResolver
  }

  // #attachConsumer(): Consumer {
  //   const ready = this.#consumers.filter(entry => !entry.isPaused())
  //   let consumer
  //
  //   if (ready.length < this.concurrency) {
  //     consumer = new Consumer()
  //     this.#consumers.push(consumer)
  //   }
  //
  //   return consumer
  // }

  #spawn(job: I) {
    const resolver = this.#getResolver(job, this.#abortController.signal)
    this.#pool.unshift(resolver)
    return resolver.promise
  }

  async job(job: I): Promise<O> {
    const resolver = this.#getResolver(job, this.#abortController.signal)
    this.#pool.push(resolver)
    return resolver.promise
  }
}
