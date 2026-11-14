import { prisma } from '@/lib/prisma'
import { buildTsQuery } from '@/lib/data/text-search'

export type KnowledgeHit = { slug: string; title: string; category: string; body: string }

/** Ranked full-text search over the guide's knowledge base. */
export async function searchKnowledge(query: string, limit = 3): Promise<KnowledgeHit[]> {
  const tsQuery = buildTsQuery(query, 'any')
  if (!tsQuery) return []

  return prisma.$queryRaw<KnowledgeHit[]>`
    SELECT k."slug", k."title", k."category", k."body"
    FROM "KnowledgeArticle" k,
      to_tsquery('english', ${tsQuery}) AS query,
      LATERAL (
        SELECT
          setweight(to_tsvector('english', k."title"), 'A') ||
          setweight(to_tsvector('english', k."keywords"), 'A') ||
          setweight(to_tsvector('english', k."category"), 'B') ||
          setweight(to_tsvector('english', k."body"), 'C') AS doc
      ) d
    WHERE d.doc @@ query
    ORDER BY ts_rank(d.doc, query) DESC, k."slug"
    LIMIT ${limit}`
}

export async function listKnowledgeTopics() {
  return prisma.knowledgeArticle.findMany({
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
    select: { slug: true, title: true, category: true },
  })
}
