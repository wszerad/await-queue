export interface Context<I = any, O = any> {
  abort: () => void
  signal: AbortSignal
  spawn: (input: I) => O
}

let currentContext: Context | null = null

export const setContext = (context: Context) => {
  currentContext = context
  setTimeout(() => currentContext = null, 0)
}

export function getContext(): Context {
  if (!currentContext) {
    throw new Error('No context')
  }

  return currentContext
}
