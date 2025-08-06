import { PromiseResolver, PromiseResolverOptions } from './PromiseResolver.ts'
import { QueuePoll, QueuePollOptions } from './QueuePoll.ts'
import { ResolverCache } from './ResolverCache'
import { Mapper, RecursiveResolver, Resolver } from './types'

type AsyncCollectorOptions<I, O> = QueuePollOptions & PromiseResolverOptions & {
  signal?: AbortSignal
  cache?: ResolverCache<I, O>
}

export class AsyncResolver<I, O, M> {
  #pool: QueuePoll
  #resolver: Resolver<I, O> | Resolver<I, M>
  #map: Mapper<M, O>
  #options: AsyncCollectorOptions<I, O>

  constructor(resolver: Resolver<I, O>)
  constructor(resolver: Resolver<I, O>, options: AsyncCollectorOptions<I, O>)
  constructor(resolver: Resolver<I, M>, map?: RecursiveResolver<I, M, O>, options?: AsyncCollectorOptions<I, O>)
  constructor(
    resolver: Resolver<I, O> | Resolver<I, M>,
    mapOrOptions?: AsyncCollectorOptions<I, O> | RecursiveResolver<I, M, O>,
    options?: AsyncCollectorOptions<I, O>
  ) {
    options = (typeof mapOrOptions === 'function' ? options : mapOrOptions) || {}
    mapOrOptions = typeof mapOrOptions === 'function' ? mapOrOptions : undefined

    this.#pool = new QueuePoll({
      interval: options.interval || 0,
      concurrency: options.concurrency || Infinity
    })

    if (options.signal) {
      options.signal.addEventListener('abort', this.#pool.abort)
    }

    this.#resolver = resolver
    this.#map = mapOrOptions
      ? (out) => mapOrOptions(out, input => this.job(input), this.#pool.signal)
      : (out) => out as any as O
    this.#options = options
  }

  async job(input: I): Promise<O> {
    let promise

    if (!this.#options.cache || !(promise = this.#options.cache.get(input))) {
      const resolver = new PromiseResolver(
        input,
        this.#resolver,
        this.#options,
        this.#map
      )

      this.#options.cache?.set(input, resolver.promise)
      this.#pool.push(resolver)

      return resolver.promise
    }

    return promise
  }

  jobs(inputs: I[]): Promise<O>[] {
    return inputs.map(input => this.job(input))
  }
}
