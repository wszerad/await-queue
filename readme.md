# AwaitQueue

A TypeScript helper for managing asynchronous jobs with support for concurrency, retry, delay, timeout, and caching.

```ts
const resolver = new AwaitQueue(async (name, signal) => {
  const req = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`, {
    method: 'GET',
    signal,
  })
  const details = await req.json()
  return details
}, {
  concurrency: 2
})

const pokemonDetailsList = await Promise.all(
  ['pikachu', 'charmander', 'bulbasaur', 'squirtle'].map(name => resolver.job(name))
)
```

## class AwaitQueue<I,O>(resolver, options)

### resolver: (job: I, signal: AbortSignal) => Promise<O>
A function that takes input of type I and returns a Promise of type O.

### options
* concurrency?: number - The maximum number of concurrent jobs that can be processed at the same time.
* interval?: number - The minimum time interval between job executions.
* retry?: number - The number of times to retry a job if it fails.
* timeout?: number - The maximum time to wait for a job to complete before timing out.
* delay?: number - The delay before retry the job, in milliseconds.
* signal?: AbortSignal - An optional AbortSignal to cancel the job.
* cache?: ResolverCache<I, O> - An optional cache to store results of previous jobs.

## methods

### job
```job(input: I): Promise<O>```
### jobs
```jobs(inputs: I[]): Promise<O>[]```

# Recursive support
## class AwaitQueue<I,O,M>(resolver, map, options?)
### map: (output: M, resolver: (job: I) => Promise<O>, signal: AbortSignal) => Promise<O>
Postprocessing function, receive a result of resolver and allow to call a recursive job with independent timeout or retry counter.
