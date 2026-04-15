import type { SearchHit } from "./types"
import { Piece } from "./piece"
import { Taxonomy } from "./taxonomy"
import { IpkLLM } from "./llm"

const clean = (text: string) => text.toLowerCase()

const contains = (text: string, words: string[]) => words.filter((word) => clean(text).includes(clean(word)))

const overlap = (left: string[] | undefined, right: string[]) => {
  if (!left || left.length === 0 || right.length === 0) return []
  const set = new Set(left.map(clean))
  return right.filter((item) => set.has(clean(item)))
}

const confidence = (score: number) => Math.max(0, Math.min(1, 0.25 + score / 10))

export namespace Search {
  export async function run(input: { query: string; limit?: number }): Promise<SearchHit[]> {
    const docs = await Piece.docs()
    if (docs.length === 0) return []

    const words = Taxonomy.split(input.query)
    const refs = await Taxonomy.expand(input.query)
    const limit = Math.max(1, Math.min(50, input.limit ?? 5))

    const scored = docs
      .map((doc) => {
        const parts = [
          doc.meta.title,
          doc.surface.catalog.summary,
          doc.surface.retrieve.summary,
          ...(doc.surface.retrieve.keywords ?? []),
          ...(doc.surface.retrieve.problems ?? []),
        ].join("\n")
        const match = contains(parts, words)
        const by_domain = overlap(doc.meta.domains, refs.domains)
        const by_method = overlap(doc.meta.methods, refs.methods)
        const by_project = overlap(doc.meta.projects, refs.projects)
        const by_context = overlap(doc.meta.contexts, refs.contexts)
        const score =
          match.length * 2 +
          by_domain.length * 3 +
          by_method.length * 3 +
          by_project.length * 2 +
          by_context.length * 1
        if (score <= 0) return
        const why = [
          match.length > 0 ? `命中文本片段 ${match.length} 处` : "",
          by_domain.length > 0 ? `领域命中：${by_domain.join(", ")}` : "",
          by_method.length > 0 ? `方法命中：${by_method.join(", ")}` : "",
          by_project.length > 0 ? `项目命中：${by_project.join(", ")}` : "",
          by_context.length > 0 ? `语境命中：${by_context.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("；")

        return {
          piece_id: doc.meta.id,
          title: doc.meta.title,
          summary: doc.surface.retrieve.summary,
          role: doc.surface.retrieve.role ?? "idea",
          confidence: confidence(score),
          why: why || "文本语义相关",
          score,
        }
      })
      .filter((item): item is NonNullable<typeof item> => !!item)
      .sort((a, b) => b.score - a.score)

    const base = scored.slice(0, Math.max(limit, 12))
    const rerank = await IpkLLM.rerankSearch({
      query: input.query,
      candidates: base.map((item) => ({
        piece_id: item.piece_id,
        title: item.title,
        summary: item.summary,
        hints: [item.why, item.role],
      })),
    })

    if (!rerank || rerank.length === 0) {
      return base.slice(0, limit).map(({ score: _score, ...item }) => item)
    }

    const byId = new Map(base.map((item) => [item.piece_id, item] as const))
    const top = rerank
      .map((item) => {
        const hit = byId.get(item.piece_id)
        if (!hit) return
        return {
          ...hit,
          why: item.why || hit.why,
          confidence: Math.max(0, Math.min(1, item.confidence)),
          role: item.role || hit.role,
        }
      })
      .filter((item): item is NonNullable<typeof item> => !!item)
      .slice(0, limit)
      .map(({ score: _score, ...item }) => item)

    if (top.length > 0) return top
    return base.slice(0, limit).map(({ score: _score, ...item }) => item)
  }
}
