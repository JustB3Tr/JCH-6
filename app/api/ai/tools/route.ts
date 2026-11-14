import { handle } from '@/lib/api'
import { toolCatalog } from '@/lib/ai/tools'

// The guide's toolset, for the "what can it do" panel in the UI.
export const GET = handle(async () => ({ tools: toolCatalog() }))
