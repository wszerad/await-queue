export type Resolver<I = any, O = any> = (job: I, signal: AbortSignal) => Promise<O>

export type RecursiveResolver<I = any, M = any, O = any> = (output: M, caller: (job: I) => Promise<O>, signal: AbortSignal) => Promise<O>

export type Mapper<I = any, O = any> = (job: I) => O | Promise<O>

export class TimeoutError extends Error {
	message = 'Timeout error'
}

export class AbortError extends Error {
	message = 'Abort error'
}
