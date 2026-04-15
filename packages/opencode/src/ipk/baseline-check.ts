import fs from "fs/promises"
import { Identifier } from "@/id/id"
import { Ipk, Storage } from "@/ipk"
import type { PieceMeta, PieceSurface, PieceLinks } from "@/ipk"

const iso = (day: number) => `2026-01-${String(day).padStart(2, "0")}T00:00:00.000Z`

const md = (title: string, summary: string, body: string) => `# ${title}

## Summary

${summary}

## Body

${body}
`

const make = async (input: {
  id: string
  type: PieceMeta["type"]
  title: string
  summary: string
  body: string
  day: number
  domains: string[]
  methods: string[]
  projects: string[]
  contexts: string[]
  questions?: string[]
  links?: PieceLinks["links"]
}) => {
  const meta: PieceMeta = {
    id: input.id,
    type: input.type,
    title: input.title,
    created_at: iso(input.day),
    updated_at: iso(input.day),
    origin: {
      kind: "manual",
    },
    status: "seed",
    domains: input.domains,
    methods: input.methods,
    projects: input.projects,
    contexts: input.contexts,
    sources: [{ kind: "fixture", ref: "baseline" }],
  }

  const surface: PieceSurface = {
    human: {
      body_summary: input.summary,
    },
    catalog: {
      summary: input.summary,
    },
    retrieve: {
      summary: input.summary,
      problems: input.questions ?? [],
      questions: input.questions ?? [],
      open_questions: input.questions ?? [],
      keywords: input.summary.split(/[\s,，、]+/u).filter((item) => item.length > 1),
      retrieval_hints: [input.title, ...input.methods, ...input.domains],
      role: input.type === "knowledge" ? "evidence" : "idea",
    },
    associate: {
      summary: `可用于联想：${input.title}`,
      methods: input.methods,
      problems: input.questions ?? [],
      association_hints: [`从 ${input.title} 扩展到相邻问题`],
    },
  }

  const links: PieceLinks = {
    links: input.links ?? [],
  }

  const dir = Storage.pieceDir(meta)
  await fs.mkdir(dir, { recursive: true })
  await Promise.all([
    Storage.writeText(Storage.file(dir, "piece.md"), md(input.title, input.summary, input.body)),
    Storage.writeText(Storage.file(dir, "meta.json"), JSON.stringify(meta, null, 2)),
    Storage.writeText(Storage.file(dir, "surface.json"), JSON.stringify(surface, null, 2)),
    Storage.writeText(Storage.file(dir, "links.json"), JSON.stringify(links, null, 2)),
  ])
}

const run = async () => {
  await fs.rm(Storage.root(), { recursive: true, force: true })
  await Storage.ensure()

  const ids = Array.from({ length: 14 }, () => Identifier.ascending("piece"))
  await make({
    id: ids[0],
    type: "idea",
    title: "anisotropic Ising 自对偶条件",
    summary: "围绕 anisotropic Ising 的自对偶条件与临界线展开。",
    body: "讨论 duality、critical line 与可检验条件。",
    day: 1,
    domains: ["statistical-physics"],
    methods: ["duality"],
    projects: ["anisotropic-ising"],
    contexts: ["research"],
    questions: ["自对偶条件如何约束临界线？"],
    links: [{ target: ids[7], kind: "extends", reason: "延续 duality 与 RG 的桥接讨论" }],
  })
  await make({
    id: ids[1],
    type: "knowledge",
    title: "critical line 估计",
    summary: "给出 anisotropic 情况下 critical line 的近似估计。",
    body: "用参数化方式估计相界。",
    day: 2,
    domains: ["statistical-physics"],
    methods: ["duality"],
    projects: ["anisotropic-ising"],
    contexts: ["research"],
    questions: ["近似误差如何评估？"],
  })
  await make({
    id: ids[2],
    type: "thread",
    title: "duality 假设边界",
    summary: "整理 duality 适用边界与反例风险。",
    body: "不把直觉当结论。",
    day: 3,
    domains: ["statistical-physics"],
    methods: ["duality"],
    projects: ["anisotropic-ising"],
    contexts: ["discussion"],
  })
  await make({
    id: ids[3],
    type: "knowledge",
    title: "RG fixed point 速记",
    summary: "记录 RG fixed point 与 scaling 关系。",
    body: "RG 与 fixed point 的关系式。",
    day: 4,
    domains: ["statistical-physics"],
    methods: ["rg"],
    projects: ["critical-phenomena"],
    contexts: ["learning"],
    questions: ["哪些量在 RG 流下不变？"],
  })
  await make({
    id: ids[4],
    type: "idea",
    title: "renormalization group 解释框架",
    summary: "从 renormalization group 角度解释相变附近行为。",
    body: "RG 提供跨尺度解释。",
    day: 5,
    domains: ["statistical-physics"],
    methods: ["rg"],
    projects: ["critical-phenomena"],
    contexts: ["research"],
  })
  await make({
    id: ids[5],
    type: "idea",
    title: "重整化群 与 有效理论",
    summary: "重整化群（RG）与 effective theory 的联系。",
    body: "中英混合术语：RG, renormalization group, 重整化群。",
    day: 6,
    domains: ["statistical-physics"],
    methods: ["rg"],
    projects: ["critical-phenomena"],
    contexts: ["discussion"],
  })
  await make({
    id: ids[6],
    type: "plan",
    title: "duality 验证计划",
    summary: "规划下一步 duality 数值验证实验。",
    body: "分三步执行，先小系统后放大。",
    day: 7,
    domains: ["statistical-physics"],
    methods: ["duality"],
    projects: ["anisotropic-ising"],
    contexts: ["writing"],
  })
  await make({
    id: ids[7],
    type: "idea",
    title: "duality 到 RG 的桥接",
    summary: "弱桥接：把 duality 的观察转到 RG 语言。",
    body: "桥接 piece #1",
    day: 8,
    domains: ["statistical-physics"],
    methods: ["duality", "rg"],
    projects: ["bridge-lab"],
    contexts: ["research"],
    links: [{ target: ids[0], kind: "derived_from", reason: "源自自对偶讨论" }],
  })
  await make({
    id: ids[8],
    type: "thread",
    title: "finite-size scaling 与 duality",
    summary: "弱桥接：从 finite-size scaling 观察 duality 现象。",
    body: "桥接 piece #2",
    day: 9,
    domains: ["statistical-physics"],
    methods: ["duality", "rg"],
    projects: ["bridge-lab"],
    contexts: ["discussion"],
  })
  await make({
    id: ids[9],
    type: "idea",
    title: "厨房温度控制笔记",
    summary: "干扰 piece：烹饪温度控制。",
    body: "与物理模型无关。",
    day: 10,
    domains: ["general"],
    methods: ["analysis"],
    projects: ["life"],
    contexts: ["reflection"],
  })
  await make({
    id: ids[10],
    type: "plan",
    title: "旅行预算计划",
    summary: "干扰 piece：旅行预算与清单。",
    body: "与 Ising/RG 无关。",
    day: 11,
    domains: ["general"],
    methods: ["analysis"],
    projects: ["life"],
    contexts: ["writing"],
  })
  await make({
    id: ids[11],
    type: "knowledge",
    title: "critical line 与 相变点记录",
    summary: "中英混合：critical line、phase transition、相变点。",
    body: "用于检索混合术语。",
    day: 12,
    domains: ["statistical-physics"],
    methods: ["duality"],
    projects: ["anisotropic-ising"],
    contexts: ["learning"],
  })
  await make({
    id: ids[12],
    type: "review",
    title: "RG 术语统一复盘",
    summary: "统一 RG / renormalization group / 重整化群 术语。",
    body: "词表归一验证样本。",
    day: 13,
    domains: ["statistical-physics"],
    methods: ["rg"],
    projects: ["bridge-lab"],
    contexts: ["review"],
  })
  await make({
    id: ids[13],
    type: "idea",
    title: "待二次编辑样本",
    summary: "用于测试 edit-start -> revise -> commit。",
    body: "初版内容。",
    day: 14,
    domains: ["statistical-physics"],
    methods: ["duality"],
    projects: ["anisotropic-ising"],
    contexts: ["discussion"],
  })

  await Ipk.reindex()

  const draft = await Ipk.draft({ mode: "new", message_ids: [] })
  const revised = await Ipk.revise({ draft_id: draft.draft_id, instruction: "不要写成结论，它只是猜想" })
  const stashed = revised ? await Ipk.stash({ draft_id: revised.draft_id }) : undefined
  const stashedList = await Ipk.listDrafts()
  const reopened = stashed ? await Ipk.getDraft(stashed.draft_id) : undefined

  const commitDraft = await Ipk.draft({ mode: "new", message_ids: [] })
  const committed = await Ipk.commit({ draft_id: commitDraft.draft_id })

  const edit = await Ipk.editStart({ piece_id: ids[13] })
  if (edit) {
    await Ipk.revise({ draft_id: edit.draft_id, instruction: "补充第二个问题意识" })
    await Ipk.commit({ draft_id: edit.draft_id })
  }

  const search = await Ipk.search({ query: "anisotropic Ising 自对偶 duality", limit: 5 })
  const assoc = await Ipk.associate({ query: "围绕 duality 做更广泛联想", seed_piece_id: ids[0], limit: 5 })
  const mixed = await Ipk.search({ query: "重整化群 RG renormalization group", limit: 5 })
  const rgA = await Ipk.search({ query: "RG", limit: 5 })
  const rgB = await Ipk.search({ query: "renormalization group", limit: 5 })
  const rgC = await Ipk.search({ query: "重整化群", limit: 5 })
  const low = await Ipk.search({ query: "medieval poetry and sonnet", limit: 5 })

  const overlap = (left: string[], right: string[]) => left.filter((item) => right.includes(item))
  const rgIdsA = rgA.map((item) => item.piece_id)
  const rgIdsB = rgB.map((item) => item.piece_id)
  const rgIdsC = rgC.map((item) => item.piece_id)

  const checks = {
    draft_revise_loop: !!(revised && revised.body.includes("改进要求")),
    stash_reopen: !!(stashed && reopened && stashedList.some((item) => item.draft_id === stashed.draft_id)),
    commit_reindex: !!(committed && (await Bun.file(Storage.file(Storage.indexesRoot(), "by_type.json")).exists())),
    normal_summary_new_piece: !!(committed && !ids.includes(committed.piece_id)),
    search_precision: search.length > 0 && search[0].piece_id === ids[0],
    associate_broad_controlled: assoc.length > 0 && assoc.length <= 5 && assoc.some((item) => item.piece_id === ids[7]),
    mixed_language: mixed.some((item) => [ids[3], ids[5], ids[12]].includes(item.piece_id)),
    taxonomy_normalization: overlap(rgIdsA, rgIdsB).length > 0 && overlap(rgIdsA, rgIdsC).length > 0,
    edit_piece_flow: !!edit,
    low_related_conservative: low.length <= 1,
  }

  console.log(JSON.stringify(checks, null, 2))
}

await run()
