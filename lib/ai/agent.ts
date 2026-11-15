import type { LatLng } from '@/lib/geo'
import { streamModel, type ModelMessage, type ToolCall } from '@/lib/ai/ollama'
import { buildSystemPrompt, type GuideSession } from '@/lib/ai/prompt'
import { CORE_TOOL_NAMES, isKnownTool, runTool, toolLabel, toolSpecs, type ToolContext } from '@/lib/ai/tools'
import { searchWeb } from '@/lib/ai/web'
import type { AiStreamEvent, AiToolStep, AiWebSource, PlaceSummary } from '@/lib/types'

// The last round is always answered without tools, so the model can make at
// most MAX_ROUNDS - 1 rounds of tool calls.
const MAX_ROUNDS = 6
const MAX_CITED_PLACES = 6

// Questions about hours, prices or closures are the ones a model gets wrong
// from memory, so they are grounded with a live search before it answers.
const LIVE_FACT_PATTERN =
  /\b(open|opened|closed|closing|hours?|opening|admission|tickets?|parking|fees?|price|prices|cost|closure|closures|holiday)\b/i

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

export type AgentResult = {
  text: string
  tools: string[]
  places: PlaceSummary[]
  steps: AiToolStep[]
  sources: AiWebSource[]
}

/** A short, human-readable version of the arguments a tool was called with. */
function detailOf(raw: unknown): string | undefined {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return undefined
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const args = value as Record<string, unknown>
  const parts = ['query', 'place', 'name', 'near', 'community', 'from', 'url']
    .map((key) => (typeof args[key] === 'string' ? (args[key] as string).trim() : ''))
    .filter(Boolean)
  return parts.length ? parts.join(' · ').slice(0, 90) : undefined
}

/** One line describing what a tool found, for the trace under the reply. */
function summarizeToolResult(content: string): string | undefined {
  try {
    const data = JSON.parse(content) as Record<string, unknown>
    if (typeof data.error === 'string') return data.error.slice(0, 120)
    if (data.ok === true) return 'Done'
    const count = typeof data.count === 'number' ? data.count : null
    const list = ['places', 'events', 'communities', 'results', 'articles', 'options', 'days'].find((key) =>
      Array.isArray(data[key]),
    )
    if (count !== null && list) {
      const noun = list === 'results' ? 'web result' : list === 'days' ? 'day' : list.replace(/s$/, '')
      return `${count} ${noun}${count === 1 ? '' : 's'}`
    }
    if (typeof data.note === 'string') return data.note.slice(0, 120)
    if (typeof data.instant_answer === 'string') return 'Found a direct answer'
  } catch {
    return undefined
  }
  return undefined
}

/**
 * Some model templates print a tool call as text instead of returning it in
 * the tool_calls field. Those blocks are never part of a real answer.
 */
function cleanAnswer(text: string) {
  return text
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
    .replace(/<function=[\s\S]*?<\/function>/g, '')
    .replace(/<\|[^|]*\|>/g, '')
    .trim()
}

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
  const seenSources = new Map<string, AiWebSource>()
  const steps: AiToolStep[] = []

  const toolContext: ToolContext = {
    userId: input.userId,
    location: input.location,
    notePlaces: (places) => places.forEach((place) => seenPlaces.set(place.id, place)),
    noteSources: (sources) =>
      sources.forEach((source) => {
        if (source.url) seenSources.set(source.url, source)
      }),
    activate: (names) => names.forEach((name) => active.add(name)),
  }

  const systemPrompt = buildSystemPrompt(input.session)
  const messages: ModelMessage[] = [{ role: 'system', content: systemPrompt }, ...input.history]

  const question = [...input.history].reverse().find((message) => message.role === 'user')?.content ?? ''
  if (LIVE_FACT_PATTERN.test(question)) {
    const stepId = 'ground-web_search'
    const detail = question.slice(0, 90)
    used.add('web_search')
    steps.push({ id: stepId, name: 'web_search', label: 'Checking the live web', detail, status: 'running' })
    emit({ type: 'tool', stepId, name: 'web_search', label: 'Checking the live web', detail })

    const { results, instantAnswer } = await searchWeb(question, 4)
    results.forEach((source) => seenSources.set(source.url, source))
    const summary = results.length
      ? `${results.length} web result${results.length === 1 ? '' : 's'}`
      : instantAnswer
        ? 'Found a direct answer'
        : 'No results'
    const step = steps.find((entry) => entry.id === stepId)
    if (step) {
      step.status = 'done'
      step.summary = summary
    }
    emit({ type: 'tool_done', stepId, name: 'web_search', summary })

    if (results.length || instantAnswer) {
      // The model template only allows one system message, at the very start.
      const live = [
        "Live web results for the user's question. They are current, so prefer them over memory. Answer only from these results and do not search again; if they do not state the answer, say you could not confirm it today.",
        instantAnswer ? `Direct answer: ${instantAnswer}` : null,
        ...results.map((source) => `- ${source.title} (${source.domain}): ${source.snippet ?? ''}`),
      ]
        .filter(Boolean)
        .join('\n')
      messages[0] = { role: 'system', content: `${systemPrompt}\n\n# Live web results\n${live}` }
    }
  }

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
      const answer = cleanAnswer(text)
      if (answer) {
        return {
          text: answer,
          tools: [...used],
          places: citedPlaces(answer, seenPlaces),
          steps,
          sources: [...seenSources.values()].slice(0, 6),
        }
      }
      break
    }

    // Anything said before a tool call was thinking out loud, not the answer.
    if (text) emit({ type: 'reset' })
    messages.push({ role: 'assistant', content: text, tool_calls: calls })

    const results = await Promise.all(
      calls.map(async (call, index) => {
        const name = call.function?.name ?? ''
        const stepId = `${round}-${index}-${name}`
        const label = toolLabel(name)
        const detail = detailOf(call.function?.arguments)
        used.add(name)
        steps.push({ id: stepId, name, label, detail, status: 'running' })
        emit({ type: 'tool', stepId, name, label, detail })

        const content = await runTool(name, call.function?.arguments, toolContext)
        const summary = summarizeToolResult(content)
        const step = steps.find((entry) => entry.id === stepId)
        if (step) {
          step.status = 'done'
          step.summary = summary
        }
        emit({ type: 'tool_done', stepId, name, summary })
        return { name, content }
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
  return { text: fallback, tools: [...used], places: [], steps, sources: [...seenSources.values()].slice(0, 6) }
}
