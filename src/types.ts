export type Processor<T, R> = (inputs: T[]) => Promise<R[]>

export type Spawn<I, O> = (input: I) => Promise<O>


