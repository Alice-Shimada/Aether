import z from "zod"
import { Provider } from "@/provider/provider"
import { ModelID, ProviderID } from "@/provider/schema"
import { ensure, root, writeText, safeJoin } from "./storage"

export const AdaptationModelKind = z.enum(["signal_extract", "summary_aggregate", "proposal_generate", "semantic_merge", "scope_match"])

export const AdaptationModelRef = z.object({
  providerID: z.string(),
  modelID: z.string(),
})

export const AdaptationModelMap = z.object({
  signal_extract: AdaptationModelRef.optional(),
  summary_aggregate: AdaptationModelRef.optional(),
  proposal_generate: AdaptationModelRef.optional(),
  semantic_merge: AdaptationModelRef.optional(),
  scope_match: AdaptationModelRef.optional(),
})

export const AdaptationModelConfig = z.object({
  version: z.literal("v1"),
  updated_at: z.string(),
  models: AdaptationModelMap,
})

export type AdaptationModelKind = z.infer<typeof AdaptationModelKind>
export type AdaptationModelRef = z.infer<typeof AdaptationModelRef>
export type AdaptationModelMap = z.infer<typeof AdaptationModelMap>
export type AdaptationModelConfig = z.infer<typeof AdaptationModelConfig>

const now = () => new Date().toISOString()

const file = () => safeJoin(root(), "model.json")

const empty = (): AdaptationModelConfig => ({
  version: "v1",
  updated_at: now(),
  models: {},
})

const read = async () => {
  await ensure()
  const raw = await Bun.file(file())
    .json()
    .catch(() => undefined)
  const item = AdaptationModelConfig.safeParse(raw)
  if (item.success) return item.data
  const next = empty()
  await writeText(file(), JSON.stringify(next, null, 2))
  return next
}

const write = async (models: AdaptationModelMap) => {
  await ensure()
  const next: AdaptationModelConfig = {
    version: "v1",
    updated_at: now(),
    models,
  }
  await writeText(file(), JSON.stringify(next, null, 2))
  return next
}

const patch = async (partial: Partial<AdaptationModelMap>) => {
  const prev = await read()
  const next: AdaptationModelMap = {
    ...prev.models,
    ...partial,
  }
  return write(next)
}

const valid = async (ref: AdaptationModelRef) =>
  Provider.getModel(ProviderID.make(ref.providerID), ModelID.make(ref.modelID))
    .then(() => true)
    .catch(() => false)

export namespace AdaptationModel {
  export async function get() {
    return read()
  }

  export async function set(partial: Partial<AdaptationModelMap>) {
    const rows = Object.entries(partial) as Array<[AdaptationModelKind, AdaptationModelRef | undefined]>
    const checks = await Promise.all(
      rows.map(async ([kind, ref]) => ({
        kind,
        ok: !ref || (await valid(ref)),
      })),
    )
    const bad = checks.filter((item) => !item.ok).map((item) => item.kind)
    if (bad.length > 0) throw new Error(`invalid model for: ${bad.join(", ")}`)
    return patch(partial)
  }

  export async function pick(kind: AdaptationModelKind, override?: AdaptationModelRef) {
    const ref = override ?? (await get()).models[kind]
    if (ref) {
      return Provider.getModel(ProviderID.make(ref.providerID), ModelID.make(ref.modelID)).catch(() => undefined)
    }
    const base = await Provider.defaultModel().catch(() => undefined)
    if (!base) return
    return Provider.getModel(base.providerID, base.modelID).catch(() => undefined)
  }
}
