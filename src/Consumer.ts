import { PromiseResolver } from './PromiseResolver.ts'

export class Consumer {
  #spawns: PromiseResolver[]
  pause = 0

  constructor() {
    this.#spawns = []
    this.#consume()
  }

  isPaused() {
    return this.pause <= Date.now()
  }

  resume() {
    this.#consume()
  }

  spawn(entry: PromiseResolver) {
    this.#spawns.unshift(entry)
    this.#consume()
  }

  #consume() {
    // TODO ignore if paused?

    let resume = Infinity

    const now = Date.now()
    const next = this.#spawns.find(entry => {
      if (entry.isRunning()) {
        return false
      }

      const runnable = entry.runnable

      if (runnable < resume) {
        resume = runnable
      }
      return !entry.isRunning() && entry.runnable <= now
    })

    if (next) {
      return next.run().finally(this.#consume)
    }

    if (resume === Infinity) {
      return
    }

    this.pause = resume
  }
}
