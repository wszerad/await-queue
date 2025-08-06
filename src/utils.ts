export const wait = (time: number) => {
  return new Promise((res) => {
    setTimeout(res, time)
  })
}

export function promiseWithResolvers<T>() {
  if (typeof Promise.withResolvers === 'undefined') {
    return Promise.withResolvers<T>()
  }

  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
