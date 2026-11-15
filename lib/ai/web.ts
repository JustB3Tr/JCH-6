import type { AiWebSource } from '@/lib/types'

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
}

function decodeHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&(amp|lt|gt|quot|#39|#x27|apos|nbsp|ndash|mdash);/g, (entity) => ENTITY_MAP[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim()
}

function unwrapDuckDuckGoUrl(rawHref: string): string | null {
  const href = rawHref.replace(/&amp;/g, '&').trim()
  try {
    const normalized = href.startsWith('//') ? `https:${href}` : href
    const parsed = new URL(normalized)
    if (parsed.hostname.endsWith('duckduckgo.com')) {
      const uddg = parsed.searchParams.get('uddg')
      if (uddg) return uddg
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString()
    }
  } catch {
    return null
  }
  return null
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function isSafePublicUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    const host = parsed.hostname.toLowerCase()
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '0.0.0.0' ||
      host === '[::1]' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

async function fetchDuckDuckGoHtml(query: string, maxResults: number): Promise<AiWebSource[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=us-en`
  const response = await fetch(url, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(7000),
  })
  if (!response.ok) return []
  const html = await response.text()

  const blocks = html.split(/class="result\s+results_links/g).slice(1)
  const items: AiWebSource[] = []
  const seen = new Set<string>()

  for (const block of blocks) {
    if (items.length >= maxResults) break
    const titleMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!titleMatch) continue
    const unwrapped = unwrapDuckDuckGoUrl(titleMatch[1])
    if (!unwrapped || !isSafePublicUrl(unwrapped)) continue
    if (unwrapped.includes('duckduckgo.com/y.js')) continue
    if (seen.has(unwrapped)) continue

    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div|span)>/)
    const title = decodeHtml(titleMatch[2])
    const snippet = snippetMatch ? decodeHtml(snippetMatch[1]) : ''
    if (!title) continue

    seen.add(unwrapped)
    items.push({
      title,
      url: unwrapped,
      domain: domainOf(unwrapped),
      snippet: snippet.slice(0, 320),
    })
  }
  return items
}

/** The lite endpoint is a second chance when the HTML one is throttled. */
async function fetchDuckDuckGoLite(query: string, maxResults: number): Promise<AiWebSource[]> {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=us-en`
  const response = await fetch(url, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(7000),
  })
  if (!response.ok) return []
  const html = await response.text()

  const items: AiWebSource[] = []
  const seen = new Set<string>()
  const pattern =
    /<a[^>]+href="([^"]+)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>([\s\S]*?)(?=<a[^>]+class=['"]result-link['"]|$)/g

  for (const match of html.matchAll(pattern)) {
    if (items.length >= maxResults) break
    const unwrapped = unwrapDuckDuckGoUrl(match[1])
    if (!unwrapped || !isSafePublicUrl(unwrapped) || seen.has(unwrapped)) continue
    const title = decodeHtml(match[2])
    if (!title) continue
    const snippetMatch = match[3].match(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/)
    seen.add(unwrapped)
    items.push({
      title,
      url: unwrapped,
      domain: domainOf(unwrapped),
      snippet: snippetMatch ? decodeHtml(snippetMatch[1]).slice(0, 320) : '',
    })
  }
  return items
}

async function fetchInstantAnswer(query: string): Promise<string | undefined> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    const response = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(4500),
    })
    if (!response.ok) return undefined
    const data = (await response.json()) as { AbstractText?: string; Answer?: string }
    const text = (data.Answer || data.AbstractText || '').trim()
    return text ? text.slice(0, 500) : undefined
  } catch {
    return undefined
  }
}

async function fetchWikipediaFallback(query: string, maxResults: number): Promise<AiWebSource[]> {
  try {
    const url = new URL('https://en.wikipedia.org/w/api.php')
    url.search = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: String(maxResults),
      format: 'json',
    }).toString()
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OutlyGuide/1.0 (https://outly.app)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return []
    const data = (await response.json()) as {
      query?: { search?: { title: string; snippet: string }[] }
    }
    return (data.query?.search ?? []).map((entry) => {
      const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(entry.title.replace(/\s+/g, '_'))}`
      return {
        title: `${entry.title} — Wikipedia`,
        url: pageUrl,
        domain: 'en.wikipedia.org',
        snippet: decodeHtml(entry.snippet).slice(0, 300),
      }
    })
  } catch {
    return []
  }
}

/** Searches the live web for up-to-date facts, hours, rules, closures or events. */
export async function searchWeb(
  query: string,
  maxResults = 5,
): Promise<{ query: string; instantAnswer?: string; results: AiWebSource[] }> {
  const [htmlResults, instantAnswer] = await Promise.all([
    fetchDuckDuckGoHtml(query, maxResults).catch(() => []),
    fetchInstantAnswer(query),
  ])

  let results = htmlResults
  if (!results.length) results = await fetchDuckDuckGoLite(query, maxResults).catch(() => [])
  if (!results.length) results = await fetchWikipediaFallback(query, maxResults)
  return { query, instantAnswer, results }
}

/** Downloads a public web page and extracts clean readable text for verification. */
export async function readWebpage(
  rawUrl: string,
): Promise<{ url: string; domain: string; title: string; description?: string; content: string } | { error: string }> {
  const parsed = isSafePublicUrl(rawUrl)
  if (!parsed) {
    return { error: 'Only public http/https URLs can be read.' }
  }

  try {
    const response = await fetch(parsed, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(7500),
    })
    if (!response.ok) {
      return { error: `Page returned HTTP ${response.status}. Rely on other search results instead.` }
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/') && !contentType.includes('html') && !contentType.includes('json')) {
      return { error: 'That link points to a binary file rather than a web page.' }
    }

    const raw = (await response.text()).slice(0, 220_000)
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const descMatch =
      raw.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
      raw.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)

    const bodyHtml = raw
      .replace(/<(script|style|noscript|svg|iframe|canvas|nav|footer|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|li|h1|h2|h3|h4|section|article|tr|br)>/gi, '\n')

    const lines = bodyHtml
      .split('\n')
      .map((line) => decodeHtml(line))
      .filter((line) => line.length >= 24)

    const content = lines.join('\n').slice(0, 4200)
    return {
      url: parsed.toString(),
      domain: domainOf(parsed.toString()),
      title: titleMatch ? decodeHtml(titleMatch[1]).slice(0, 160) : domainOf(parsed.toString()),
      description: descMatch ? decodeHtml(descMatch[1]).slice(0, 280) : undefined,
      content: content || 'Page loaded, but had very little readable body text.',
    }
  } catch {
    return { error: 'Could not load that web page in time. Use the search snippets or another result.' }
  }
}
