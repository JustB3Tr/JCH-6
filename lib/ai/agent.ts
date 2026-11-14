import type { LatLng } from '@/lib/geo'
import { streamModel, type ModelMessage, type ToolCall } from '@/lib/ai/ollama'
import { buildSystemPrompt, type GuideSession } from '@/lib/ai/prompt'
import { CORE_TOOL_NAMES, isKnownTool, runTool, toolLabel, toolSpecs, type ToolContext } from '@/lib/ai/tools'
import type { AiStreamEvent, PlaceSummary } from '@/lib/types'

// The last round is always answered without tools, so the model can make at
// most MAX_ROUNDS - 1 rounds of tool calls.
const MAX_ROUNDS = 6
const MAX_CITED_PLACES = 6

export type AgentInput = {
  userId: string
  session: GuideSession
  location: LatLng | null
  history: { role: 'user' | 'assistant'; content: string }[]
  /** Optional tools this chat already loaded on earlier turns. */
  loadedTools: string[]
  emit: (event: AiStreamEvent) => void
  signal?: AbortSignal
}

export type AgentResult = { text: string; tools: string[]; places: PlaceSummary[] }

/** Places the reply actually names, in the order they are mentioned. */
function citedPlaces(text: string, seen: Map<string, PlaceSummary>): PlaceSummary[] {
  const haystack = text.toLowerCase()
  return [...seen.values()]
    .map((place) => ({ place, index: haystack.indexOf(place.name.toLowerCase()) }))
    .filter((entry) => entry.index !== -1)
    .sort((a, b) => a.index - b.index)
    .slice(0, MAX_CITED_PLACES)
    .map((entry) => entry.place)
}

export async function runAgent(input: AgentInput): Promise<AgentResult> {
  const { emit, signal } = input
  const active = new Set([...CORE_TOOL_NAMES, ...input.loadedTools.filter(isKnownTool)])
  const used = new Set<string>()
  const seenPlaces = new Map<string, PlaceSummary>()

  const toolContext: ToolContext = {
    userId: input.userId,
    location: input.location,
    notePlaces: (places) => places.forEach((place) => seenPlaces.set(place.id, place)),
    activate: (names) => names.forEach((name) => active.add(name)),
  }

  const messages: ModelMessage[] = [
    { role: 'system', content: buildSystemPrompt(input.session) },
    ...input.history,
  ]

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const finalRound = round === MAX_ROUNDS - 1
    let text = ''
    const calls: ToolCall[] = []

    for await (const event of streamModel(messages, finalRound ? [] : toolSpecs(active), signal)) {
      if (event.type === 'text') {
        text += event.text
        emit({ type: 'delta', text: event.text })
      } else {
        calls.push(...event.calls)
      }
    }

    if (!calls.length) {
      const answer = text.trim()
      if (answer) return { text: answer, tools: [...used], places: citedPlaces(answer, seenPlaces) }
      break
    }

    // Anything said before a tool call was thinking out loud, not the answer.
    if (text) emit({ type: 'reset' })
    messages.push({ role: 'assistant', content: text, tool_calls: calls })

    const results = await Promise.all(
      calls.map(async (call) => {
        const name = call.function?.name ?? ''
        used.add(name)
        emit({ type: 'tool', name, label: toolLabel(name) })
        return { name, content: await runTool(name, call.function?.arguments, toolContext) }
      }),
    )
    for (const result of results) {
      messages.push({ role: 'tool', tool_name: result.name, content: result.content })
    }
  }

  const fallback =
    'I looked into that but could not put together a solid answer. Could you rephrase it, or tell me the neighborhood you have in mind?'
  emit({ type: 'reset' })
  emit({ type: 'delta', text: fallback })
  return { text: fallback, tools: [...used], places: [] }
}
