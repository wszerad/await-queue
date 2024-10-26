import { PromiseResolver } from './PromiseResolver.ts'

export interface QueuePollOptions {
  concurrency: number
  signal?: AbortSignal
}

export class QueuePoll {
  #queue: PromiseResolver[] = []
  #options: QueuePollOptions
  #delay: number = 0

  constructor(options: QueuePollOptions) {
    this.#options = options
  }

  get size() {
    return this.#queue.length
  }

  get active() {
    return this.#queue.filter(entry => entry.isRunning()).length
  }

  push(entry: PromiseResolver) {
    this.#queue.push(entry)
    this.#run()
  }

  unshift(entry: PromiseResolver) {
    this.#queue.unshift(entry)
    this.#run()
  }

  #run() {
     const next = this.#take()

    if (next instanceof PromiseResolver) {
      console.log('next')
      next.run().finally(() => {
        if (next.isCompleted()) {
          this.#remove(next)
        }
        this.#run()
      })
      return
    }

    if (next && next !== Infinity) {
      clearTimeout(this.#delay)
      this.#delay = setTimeout(() => this.#run(), next) as unknown as number
    }
  }

  #take(): PromiseResolver | number {
    const now = Date.now()
    let nextRun = Infinity
    let next: PromiseResolver | undefined

    const ff = (entry: PromiseResolver): boolean => {
      const runnable = entry.runnable
      console.log('grab', runnable, entry)

      if (runnable <= now) {
        next = entry
        return true
      }

      if (runnable < nextRun) {
        nextRun = runnable
      }

      return false
    }

    this.#queue.some(entry => ff(entry))

    return next || nextRun
  }

  #remove(entry: PromiseResolver) {
    const index = this.#queue.indexOf(entry)
    this.#queue.splice(index, 1)
  }
}

