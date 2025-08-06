import { hash } from 'ohash'

export interface ResolverCache<I, O> {
	set(input: I, output: Promise<O>): void
	get(input: I): Promise<O> | undefined
}

export class HashCache<I, O> {
	#cache = new Map<string, Promise<O>>()

	get(input: I): Promise<O> | undefined {
		const inputHash = hash(input)
		return this.#cache.get(inputHash)
	}

	set(input: I, output: Promise<O>): void {
		const inputHash = hash(input)
		this.#cache.set(inputHash, output)
	}
}
