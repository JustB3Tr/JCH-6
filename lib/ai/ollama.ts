// Streaming client for the Ollama chat API.

const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://69.234.42.159:11434').replace(/\/+$/, '')
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'Imagination-2.1-Pro'
const MODEL_TIMEOUT_MS = 120_000

export type ToolCall = { function: { name: string; arguments: unknown } }

export type ModelMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_name?: string
}

export type ToolSpec = {
  type: 'function'
  function: { name: string; description: string; parameters: object }
}

export type ModelEvent = { type: 'text'; text: string } | { type: 'tool_calls'; calls: ToolCall[] }

export class ModelError extends Error {}

type ChatChunk = {
  message?: { content?: string; tool_calls?: ToolCall[] }
  done?: boolean
  error?: string
}

/**
 * Removes <think>…</think> spans from a stream of text chunks. Reasoning is
 * disabled in the request, but some model templates still emit the tags, and
 * a tag can be split across two chunks.
 */
function createThinkFilter() {
  const OPEN = '<think>'
  const CLOSE = '</think>'
  let buffer = ''
  let thinking = false

  // Length of the longest suffix of `text` that could be the start of `tag`.
  const partialTagLength = (text: string, tag: string) => {
    for (let length = Math.min(tag.length - 1, text.length); length > 0; length--) {
      if (tag.startsWith(text.slice(-length))) return length
    }
    return 0
  }

  return (chunk: string): string => {
    buffer += chunk
    let output = ''
    for (;;) {
      const tag = thinking ? CLOSE : OPEN
      const index = buffer.indexOf(tag)
      if (index === -1) {
        const keep = partialTagLength(buffer, tag)
        if (!thinking) output += buffer.slice(0, buffer.length - keep)
        buffer = buffer.slice(buffer.length - keep)
        return output
      }
      if (!thinking) output += buffer.slice(0, index)
      buffer = buffer.slice(index + tag.length)
      thinking = !thinking
    }
  }
}

export async function* streamModel(
  messages: ModelMessage[],
  tools: ToolSpec[],
  signal?: AbortSignal,
): AsyncGenerator<ModelEvent> {
  const timeout = AbortSignal.timeout(MODEL_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        ...(tools.length ? { tools } : {}),
        stream: true,
        think: false,
        keep_alive: '30m',
        options: { temperature: 0.5 },
      }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
  } catch (error) {
    throw new ModelError(`Model unreachable: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '')
    throw new ModelError(`Model responded with ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const stripThinking = createThinkFilter()
  let pending = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      pending += decoder.decode(value, { stream: true })

      let newline: number
      while ((newline = pending.indexOf('\n')) !== -1) {
        const line = pending.slice(0, newline).trim()
        pending = pending.slice(newline + 1)
        if (!line) continue

        let chunk: ChatChunk
        try {
          chunk = JSON.parse(line) as ChatChunk
        } catch {
          continue
        }
        if (chunk.error) throw new ModelError(chunk.error)

        const text = chunk.message?.content ? stripThinking(chunk.message.content) : ''
        if (text) yield { type: 'text', text }
        if (chunk.message?.tool_calls?.length) yield { type: 'tool_calls', calls: chunk.message.tool_calls }
        if (chunk.done) return
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}
