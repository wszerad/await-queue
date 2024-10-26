import { AsyncResolver, TimeoutError } from '../src'
import {
	categories,
	images,
	ExpandedCategory,
	category1,
	category2, category3, resolveCategory
} from './data'
import { wait } from '../src/utils.ts'
import { expect } from 'vitest'
import { QueuePoll } from '../src/QueuePoll.ts'
import { getContext } from '../src/context.ts'

const getMainCategoryNames = async () => {
	await wait(50)
	return categories
		.filter(item => item.level === 0)
		.map(item => item.name)
}

const getCategoryByName = async (name: string) => {
	await wait(50)
	return categories.find(item => item.name === name)
}

const getCategoriesByNames = async (names: string[]) => {
	await wait(50)
	return categories.filter(item => names.includes(item.name))
}

const getImageList = async () => {
	await wait(50)
	return images
}

const job = (attempts: number = 0, time: number = 1) => {
	const tryMap = new Map()

	return async (input: any) => {
		await wait(time)

		const inputAttempt = tryMap.get(input) ?? attempts

		if (inputAttempt || attempts === Infinity) {
			tryMap.set(input, inputAttempt - 1)
			throw new Error('attempt failed')
		}

		return input
	}
}

describe('case circular', () => {

	it('should resolve job', async () => {
		const jobResolver = new AsyncResolver(job())
		const inputs = [1, 2]
		const results = await Promise.all(inputs.map(input => jobResolver.job(input)))

		expect(results).toEqual(inputs)
	})

	it('should fail job', async () => {
		const jobResolver = new AsyncResolver(job(Infinity))
		const inputs = [1, 2]

		await expect(() => Promise.all(inputs.map(input => jobResolver.job(input))))
			.rejects
			.toThrow('attempt failed')
	})

	it('should resolve after retry', async () => {
		const jobResolver = new AsyncResolver(job(1), { retry: 1 })
		const inputs = [1, 2]
		const results = await Promise.all(inputs.map(input => jobResolver.job(input)))

		expect(results).toEqual(inputs)
	})

	it('should fail after n retry', async () => {
		const jobResolver = new AsyncResolver(job(2), { retry: 1 })
		const inputs = [1, 2]

		await expect(() => Promise.all(inputs.map(input => jobResolver.job(input))))
			.rejects
			.toThrow('attempt failed')
	})

	it('should resolve after delay', async () => {
		const jobResolver = new AsyncResolver(job(1), { retry: 1, delay: 100 })
		const inputs = [1, 2]
		const time = Date.now()
		const results = await Promise.all(inputs.map(input => jobResolver.job(input)))

		expect(results).toEqual(inputs)
		expect(Date.now()).toBeGreaterThan(time + 100)
	})

	it('should fail after timeout', async () => {
		const jobResolver = new AsyncResolver(job(undefined, 200), { retry: 1, timeout: 100 })
		const inputs = [1, 2]

		await expect(() => Promise.all(inputs.map(input => jobResolver.job(input))))
			.rejects
			.toBeInstanceOf(TimeoutError)
	})

	it('should resolve in concurrency', async () => {
		const jobResolver = new AsyncResolver(job(), { concurrency: 1 })
		const inputs = [1, 2, 3]

		const promises = inputs.map(input => jobResolver.job(input))
		expect(jobResolver.size).toEqual(3)
		expect(jobResolver.active).toEqual(1)

		const results = await Promise.all(promises)
		expect(results).toEqual(inputs)
	})

	it('should resolve all in once', async () => {
		const jobResolver = new AsyncResolver(job(), { concurrency: Infinity })
		const inputs = [1, 2, 3]

		const promises = inputs.map(input => jobResolver.job(input))
		expect(jobResolver.size).toEqual(3)
		expect(jobResolver.active).toEqual(3)

		const results = await Promise.all(promises)
		expect(results).toEqual(inputs)
	})

	// should join similar inputs
	// signal support

	it('should resolve recursive', async () => {
		const j: (input: number) => Promise<number> = job()

		async function res(input: number) {
			const { spawn } = getContext()

			if (input <= 0) return null

			return {
				value: await j(input),
				valuePlus: await spawn(input - 1)
			}
		}

		const jobResolver = new AsyncResolver(res)
		const results = await jobResolver.job(3)

		expect(results).toEqual({
			value: 3,
			valuePlus: {
				value: 2,
				valuePlus: {
					value: 1,
					valuePlus: null
				}
			}
		})
	})

	it('should resolve recursive with limited concurrency', async () => {
		const j: (input: number) => Promise<number> = job()

		async function res(input: number) {
			const { spawn } = getContext()

			if (input <= 0) return null

			return {
				value: await j(input),
				valuePlus: await spawn(input - 1)
			}
		}

		const jobResolver = new AsyncResolver(res, { concurrency: 2 })
		const results = await jobResolver.job(3)

		expect(results).toEqual({
			value: 3,
			valuePlus: {
				value: 2,
				valuePlus: {
					value: 1,
					valuePlus: null
				}
			}
		})
	})
})
