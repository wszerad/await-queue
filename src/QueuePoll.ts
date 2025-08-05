import { PromiseResolver } from './PromiseResolver.ts'

export interface QueuePollOptions {
  concurrency?: number
  interval?: number
}

export class QueuePoll extends AbortController {
  #queue = new Set<PromiseResolver>()
  #options: QueuePollOptions
  #slots: number
  #nextRunTime = 0
  #delay: number = 0

  constructor(options: QueuePollOptions) {
    super()

    this.#slots = options.concurrency || Infinity
    this.#options = options
  }

  push(entry: PromiseResolver) {
    entry.signal.addEventListener('abort', this.abort)

    if (this.#isReady()) {
      this.#consume(entry)
      return
    }

    this.#queue.add(entry)
  }

  #isReady() {
    return !(!this.#slots || this.#nextRunTime > Date.now() || this.signal.aborted)
  }

  async #consume(entry: PromiseResolver) {
    this.#slots--

    if (this.#options.interval) {
      this.#nextRunTime = Date.now() + (this.#options.interval || 0)
    }

    if (!await entry.execute()) {
      this.#queue.add(entry)
    }

    this.#slots++

    this.#run()
  }

  #prepareDelayedRun(otherTime: number = 0) {
    const nextRunTimeout = Math.max(
      Math.max(otherTime, this.#nextRunTime) - Date.now(),
      0
    )

    if (!nextRunTimeout) {
      return
    }

    if (this.#delay) {
      clearTimeout(this.#delay)
    }
    this.#delay = setTimeout(() => this.#run(), nextRunTimeout)
  }

  async #run() {
    if (!this.#isReady()) {
      this.#prepareDelayedRun()
      return
    }

    const [time, next] = this.#take()
    console.log('next', next?.input)

    if (next) {
      this.#consume(next)
    } else if (time !== Infinity) {
      this.#prepareDelayedRun(time)
    }
  }

  #take(): [number, PromiseResolver?] {
    const now = Date.now()
    let nextRun = Infinity

    // check if can take always first
    for (const entry of this.#queue) {
      const availability = entry.availability

      if (availability <= now) {
        this.#queue.delete(entry)
        return [availability, entry]
      }

      nextRun = Math.min(nextRun, availability)
    }

    return [nextRun]
  }
}

