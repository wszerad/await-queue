import { PromiseResolver, PromiseResolverOptions } from './PromiseResolver.ts'
import { QueuePoll, QueuePollOptions } from './QueuePoll.ts'
import { ResolverCache } from './ResolverCache'

export type Resolver<I, O> = (job: I) => Promise<O>

type AsyncCollectorOptions<I, O> = QueuePollOptions & PromiseResolverOptions & {
  signal?: AbortSignal
  cache?: ResolverCache<I, O>
}

export class AsyncResolver<I, O, M> {
  #pool: QueuePoll
  #resolver: Resolver<I, O>
  #options: AsyncCollectorOptions<I, O>

  constructor(resolver: Resolver<I, O>, options?: AsyncCollectorOptions<I, O>)
  constructor(resolver: Resolver<I, M>, after?: Resolver<M, O>, options?: AsyncCollectorOptions<I, O>)
  constructor(
    resolver: Resolver<I, O>,
    afterOrOptions,
    options: AsyncCollectorOptions<I, O> = {}
  ) {
    this.#pool = new QueuePoll({
      interval: options.interval || 0,
      concurrency: options.concurrency || Infinity
    })

    if (options.signal) {
      options.signal.addEventListener('abort', this.#pool.abort)
    }

    this.#resolver = resolver
    this.#options = options
  }

  async job(input: I): Promise<O> {
    let promise

    if (!this.#options.cache || !(promise = this.#options.cache.get(input))) {
      const resolver = new PromiseResolver(
        input,
        this.#resolver,
        this.#options
      )

      this.#options.cache?.set(input, resolver.promise)
      this.#pool.push(resolver)

      return resolver.promise
    }

    return promise
  }
}
