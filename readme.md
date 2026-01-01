# AwaitQueue

[![npm version](https://img.shields.io/npm/v/@wszerad/await-queue.svg)](https://www.npmjs.com/package/@wszerad/await-queue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful TypeScript library for managing asynchronous jobs with advanced features including concurrency control, automatic retry, delays, timeouts, and caching.

## Features

✨ **Concurrency Control** - Limit the number of parallel job executions  
🔄 **Automatic Retry** - Retry failed jobs with configurable attempts  
⏱️ **Timeout Support** - Set maximum execution time for jobs  
⏳ **Interval Control** - Add minimum delays between job executions  
💾 **Built-in Caching** - Cache and reuse results for identical inputs  
🚫 **Abort Signal Support** - Cancel jobs gracefully  
🔁 **Recursive Processing** - Advanced post-processing with recursive job support  
📘 **Full TypeScript Support** - Strongly typed API

## Installation

```bash
npm install @wszerad/await-queue
```

## Quick Start

```ts
import { AwaitQueue } from '@wszerad/await-queue'

const queue = new AwaitQueue(async (name, signal) => {
  const req = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`, {
    method: 'GET',
    signal,
  })
  return await req.json()
}, {
  concurrency: 2  // Process 2 requests at a time
})

const pokemonList = await Promise.all(
  ['pikachu', 'charmander', 'bulbasaur', 'squirtle'].map(name => queue.job(name))
)
```

## API Reference

### Constructor

```ts
new AwaitQueue<I, O>(resolver, options?)
new AwaitQueue<I, O, M>(resolver, map, options?)
```

#### Parameters

##### `resolver: (input: I, signal: AbortSignal) => Promise<O>`

A function that processes each job. Receives:
- `input` - The job input data of type `I`
- `signal` - An `AbortSignal` for cancellation support

Returns a Promise that resolves to type `O`.

##### `options?: AwaitQueueOptions<I, O>`

Configuration object with the following properties:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent jobs |
| `interval` | `number` | `0` | Minimum time (ms) between job executions |
| `retry` | `number` | `0` | Number of retry attempts on failure |
| `timeout` | `number` | `undefined` | Maximum execution time (ms) per job |
| `delay` | `number` | `0` | Delay (ms) before retrying a failed job |
| `signal` | `AbortSignal` | `undefined` | Global abort signal for all jobs |
| `cache` | `ResolverCache<I, O>` | `undefined` | Cache instance for result storage |

### Methods

#### `job(input: I): Promise<O>`

Enqueues a single job and returns a promise that resolves with the result.

```ts
const result = await queue.job(input)
```

#### `jobs(inputs: I[]): Promise<O>[]`

Enqueues multiple jobs and returns an array of promises.

```ts
const results = await Promise.all(queue.jobs([input1, input2, input3]))
```

## Examples

### Concurrency Control

Limit parallel execution to prevent overwhelming external services:

```ts
const queue = new AwaitQueue(async (url) => {
  return await fetch(url).then(r => r.json())
}, {
  concurrency: 3  // Maximum 3 requests at once
})

const urls = [...Array(10)].map((_, i) => `https://api.example.com/item/${i}`)
const results = await Promise.all(queue.jobs(urls))
```

### Retry on Failure

Automatically retry failed requests:

```ts
const queue = new AwaitQueue(async (id) => {
  const response = await fetch(`https://api.example.com/data/${id}`)
  if (!response.ok) throw new Error('Request failed')
  return await response.json()
}, {
  retry: 3,     // Retry up to 3 times
  delay: 1000   // Wait 1 second before retrying
})
```

### Timeout Protection

Prevent jobs from running indefinitely:

```ts
const queue = new AwaitQueue(async (task) => {
  return await longRunningOperation(task)
}, {
  timeout: 5000  // Timeout after 5 seconds
})

try {
  const result = await queue.job(myTask)
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('Job timed out')
  }
}
```

### Caching Results

Cache results to avoid redundant processing:

```ts
import { HashCache } from '@wszerad/await-queue'

const cache = new HashCache()
const queue = new AwaitQueue(async (id) => {
  console.log(`Fetching data for ${id}`)
  return await expensiveOperation(id)
}, {
  cache
})

// First call - executes the resolver
await queue.job('user-123')

// Second call - returns cached result
await queue.job('user-123')  // Does not execute resolver again
```

### Interval Control

Add minimum delays between job executions:

```ts
const queue = new AwaitQueue(async (item) => {
  return await processItem(item)
}, {
  interval: 500  // Wait at least 500ms between jobs
})
```

### Abort Signal

Cancel all pending jobs:

```ts
const controller = new AbortController()

const queue = new AwaitQueue(async (id, signal) => {
  return await fetch(`https://api.example.com/data/${id}`, { signal })
}, {
  signal: controller.signal
})

// Cancel all pending jobs
controller.abort()
```

## Advanced: Recursive Processing

For complex scenarios where job results need further processing with independent retry/timeout logic:

```ts
new AwaitQueue<I, O, M>(resolver, map, options?)
```

### `map: (output: M, resolver: (input: I) => Promise<O>, signal: AbortSignal) => Promise<O>`

A post-processing function that receives:
- `output` - The result from the initial resolver
- `resolver` - A function to enqueue recursive jobs
- `signal` - An abort signal for the mapping operation

Example:

```ts
const queue = new AwaitQueue(
  async (url) => await fetch(url).then(r => r.json()),
  async (data, resolve, signal) => {
    // Process nested URLs from the response
    if (data.relatedUrls) {
      const nested = await Promise.all(
        data.relatedUrls.map(url => resolve(url))
      )
      return { ...data, nested }
    }
    return data
  },
  { concurrency: 5, retry: 2 }
)
```

## TypeScript Support

The library is written in TypeScript and provides full type safety:

```ts
interface User {
  id: string
  name: string
}

const queue = new AwaitQueue<string, User>(async (userId) => {
  return await fetchUser(userId)
})

const user: User = await queue.job('user-123')  // Fully typed!
```

## License

MIT © Wszerad Martynowski

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Repository

[https://github.com/wszerad/await-queue](https://github.com/wszerad/await-queue)
