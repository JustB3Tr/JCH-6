'use client'

import useSWR, { type SWRConfiguration } from 'swr'

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** fetch wrapper that turns `{ error }` responses into thrown errors. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  const text = await response.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Something went wrong. Please try again.'
    throw new ApiClientError(response.status, message)
  }
  return data as T
}

export const fetcher = <T>(path: string) => api<T>(path)

export function useApi<T>(path: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(path, fetcher, {
    revalidateOnFocus: false,
    ...config,
  })
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}
