import { AsyncResolver } from '../src'
import { TimeoutError } from '../src/types'

import { wait } from '../src/utils.ts'
import { Cache } from '../src/ResolverCache.ts'
import { expect } from 'vitest'

function testJobs<T>() {
	const running: PromiseWithResolvers<void>[] = []
	let finished = 0

	return {
		async instantCall(input: T) {
			const job = Promise.withResolvers<void>()
			running.push(job)

			console.log('call', input)
			await wait(1)
			console.log('finish', input)
			finished++

			return input
		},
		async call(input: T) {
			const job = Promise.withResolvers<void>()
			running.push(job)

			console.log('call', input)
			await job.promise
			console.log('finish', input)
			finished++

			return input
		},
		count() {
			return running.length
		},
		countFinished() {
			return finished
		},
		resolve() {
			running.forEach(job => job.resolve())
		},
		reject(message: string) {
			running.forEach(job => job.reject(message))
		}
	}
}

describe('case circular', () => {

	it('should resolve all jobs at once', async () => {
		const { call, count, resolve } = testJobs()
		const jobResolver = new AsyncResolver(call)
		const inputs = [1, 2, 3, 4, 5]
		const jobs = Promise.all(inputs.map(input => jobResolver.job(input)))

		expect(count()).toEqual(inputs.length)
		resolve()
		expect(await jobs).toEqual(inputs)
	})

	it('should resolve job in sequence', async () => {
		const { call, count, countFinished, resolve } = testJobs()
		const jobResolver = new AsyncResolver(call, { concurrency: 1 })

		const jobOne = jobResolver.job(1)
		const jobTwo = jobResolver.job(2)

		expect(count()).toEqual(1)
		resolve()
		await jobOne
		expect(countFinished()).toEqual(1)

		await wait(1)

		expect(count()).toEqual(2)
		resolve()
		await jobTwo
		expect(countFinished()).toEqual(2)
	})

	it('should resolve jobs in sequence', async () => {
		const { call, count, countFinished, resolve } = testJobs()
		const jobResolver = new AsyncResolver(call, { concurrency: 2 })
		const inputs = [1, 2, 3, 4]
		const [jobOne, jobTwo, jobTree, jobFour] = inputs.map(input => jobResolver.job(input))

		expect(count()).toEqual(2)
		resolve()
		await Promise.all([jobOne, jobTwo])
		expect(countFinished()).toEqual(2)

		await wait(1)

		expect(count()).toEqual(4)
		resolve()
		await Promise.all([jobTree, jobFour])
		expect(countFinished()).toEqual(4)
	})

	it('should resolve jobs in interval', async () => {
		const { instantCall, count } = testJobs()
		const jobResolver = new AsyncResolver(instantCall, { interval: 100 })
		const inputs = [1, 2]
		const [jobOne, jobTwo] = inputs.map(input => jobResolver.job(input))
		const startTime = Date.now()

		expect(count()).toEqual(1)
		await jobOne
		await wait(1)
		await jobTwo
		expect(Date.now() - startTime).toBeGreaterThanOrEqual(100)
	})

	it('should fail job', async () => {
		const { call, reject } = testJobs()
		const jobResolver = new AsyncResolver(call)

		const job = jobResolver.job(1)
		reject('attempt failed')

		await expect(job)
			.rejects
			.toThrow('attempt failed')
	})

	it('should resolve after retry', async () => {
		const { call, reject, resolve } = testJobs()
		const jobResolver = new AsyncResolver(call, { retry: 2 })

		const job = jobResolver.job(1)
		reject('attempt failed')
		await wait(1)
		reject('attempt failed')
		await wait(1)
		resolve()
		expect(await job).toEqual(1)
	})

	it('should resolve with cache', async () => {
		const { call, resolve, count } = testJobs()
		const jobResolver = new AsyncResolver(call, { cache: new Cache() })

		const input = {
			id: 1
		}
		const jobOne = jobResolver.job(input)
		const jobTwo = jobResolver.job({ ...input })
		resolve()

		expect(count()).toEqual(1)
		expect(await jobOne).toEqual(await jobTwo)
	})

	it('should fail after timeout', async () => {
		const { call } = testJobs()
		const jobResolver = new AsyncResolver(call, { timeout: 100 })
		const startTime = Date.now()

		await expect(jobResolver.job(1))
			.rejects
			.toBeInstanceOf(TimeoutError)
		expect(Date.now() - startTime).toBeGreaterThanOrEqual(100)
	})

	// TODO signal support

	it('should resolve recursive', async () => {
		const job = async (input: number) => {
			return Promise.resolve(input)
		}

		async function res(input: number) {
			if (input <= 0) return null

			return {
				value: await job(input),
				valuePlus: input - 1
			}
		}

		const jobResolver = new AsyncResolver(res, async (out, fn) => {
			if (!out) return out

			return {
				...out,
				valuePlus: await fn(out.valuePlus)
			}
		})
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
