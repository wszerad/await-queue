export type Resolver<I, O> = (job: I, signal: AbortSignal) => Promise<O>

export class TimeoutError extends Error {
	message = 'Timeout error'
}

export class AbortError extends Error {
	message = 'Abort error'
}
