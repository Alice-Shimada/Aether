import type { AssociateHit } from "./types"
import { Piece } from "./piece"
import { Taxonomy } from "./taxonomy"
import { IpkLLM } from "./llm"

const clean = (text: string) => text.toLowerCase()

const contains = (text: string, words: string[]) => words.filter((word) => clean(text).includes(clean(word)))

const overlap = (left: string[] | undefined, right: string[] | undefined) => {
  if (!left || !right || left.length === 0 || right.length === 0) return []
  const set = new Set(left.map(clean))
  return right.filter((item) => set.has(clean(item)))
}

const scoreRisk = (score: number) => {
  if (score >= 7) return "low"
  if (score >= 4) return "medium"
  return "high"
}

const confidence = (score: number) => Math.max(0, Math.min(1, 0.2 + score / 10))

export namespace Associate {
  export async function run(input: { query: string; limit?: number; seed_piece_id?: string }): Promise<AssociateHit[]> {
    const docs = await Piece.docs()
    if (docs.length === 0) return []

    const limit = Math.max(1, Math.min(50, input.limit ?? 5))
    const seed = input.seed_piece_id ? docs.find((doc) => doc.meta.id === input.seed_piece_id) : undefined
    const words = Taxonomy.split(input.query)
    const refs = await Taxonomy.expand(input.query)

    const scored = docs
      .filter((doc) => doc.meta.id !== seed?.meta.id)
      .map((doc) => {
        const parts = [
          doc.meta.title,
          doc.surface.associate.summary,
          ...(doc.surface.associate.association_hints ?? []),
          ...(doc.surface.associate.problems ?? []),
        ].join("\n")
        const textMatch = contains(parts, words)
        const by_method = overlap(doc.meta.methods, refs.methods)
        const by_domain = overlap(doc.meta.domains, refs.domains)
        const by_project = overlap(doc.meta.projects, refs.projects)
        const by_context = overlap(doc.meta.contexts, refs.contexts)

        const seed_methods = overlap(doc.meta.methods, seed?.meta.methods)
        const seed_domains = overlap(doc.meta.domains, seed?.meta.domains)
        const seed_projects = overlap(doc.meta.projects, seed?.meta.projects)
        const seed_link =
          !!seed &&
          (seed.links.links.some((link) => link.target === doc.meta.id) ||
            doc.links.links.some((link) => link.target === seed.meta.id))

        const score =
          textMatch.length +
          by_method.length * 2 +
          by_domain.length +
          by_project.length +
          by_context.length +
          seed_methods.length * 2 +
          seed_domains.length +
          seed_projects.length +
          (seed_link ? 3 : 0)

        if (score <= 0) return

        const reason = [
          seed_link ? "与种子 piece 存在链接关系" : "",
          seed_methods.length > 0 ? `与种子共享方法：${seed_methods.join(", ")}` : "",
          seed_domains.length > 0 ? `与种子共享领域：${seed_domains.join(", ")}` : "",
          by_method.length > 0 ? `匹配方法词：${by_method.join(", ")}` : "",
          by_domain.length > 0 ? `匹配领域词：${by_domain.join(", ")}` : "",
          textMatch.length > 0 ? `文本联想命中 ${textMatch.length} 处` : "",
        ]
          .filter(Boolean)
          .join("；")

        return {
          piece_id: doc.meta.id,
          title: doc.meta.title,
          summary: doc.surface.associate.summary,
          bridge_reason: reason || "可作为相邻议题继续展开",
          risk: doc.surface.associate.association_risk ?? scoreRisk(score),
          confidence: confidence(score),
          score,
        }
      })
      .filter((item): item is NonNullable<typeof item> => !!item)
      .sort((a, b) => b.score - a.score)

    const base = scored.slice(0, Math.max(limit, 12))
    const rerank = await IpkLLM.rerankAssociate({
      query: input.query,
      seed: input.seed_piece_id,
      candidates: base.map((item) => ({
        piece_id: item.piece_id,
        title: item.title,
        summary: item.summary,
        hints: [item.bridge_reason, item.risk],
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
          bridge_reason: item.bridge_reason || hit.bridge_reason,
          risk: item.risk || hit.risk,
          confidence: Math.max(0, Math.min(1, item.confidence)),
        }
      })
      .filter((item): item is NonNullable<typeof item> => !!item)
      .slice(0, limit)
      .map(({ score: _score, ...item }) => item)

    if (top.length > 0) return top
    return base.slice(0, limit).map(({ score: _score, ...item }) => item)
  }
}
