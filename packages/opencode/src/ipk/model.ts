import z from "zod"
import { Provider } from "@/provider/provider"
import { ModelID, ProviderID } from "@/provider/schema"
import { ensure, file as safeFile, root, writeText } from "./storage"

export const IpkModelKind = z.enum(["summarize", "revise", "search", "associate"])

export const IpkModelRef = z.object({
  providerID: z.string(),
  modelID: z.string(),
})

export const IpkModelMap = z.object({
  summarize: IpkModelRef.optional(),
  revise: IpkModelRef.optional(),
  search: IpkModelRef.optional(),
  associate: IpkModelRef.optional(),
})

export const IpkModelConfig = z.object({
  version: z.literal("v1"),
  updated_at: z.string(),
  models: IpkModelMap,
})

export type IpkModelKind = z.infer<typeof IpkModelKind>
export type IpkModelRef = z.infer<typeof IpkModelRef>
export type IpkModelMap = z.infer<typeof IpkModelMap>
export type IpkModelConfig = z.infer<typeof IpkModelConfig>

const now = () => new Date().toISOString()

const file = () => safeFile(root(), "model.json")

const empty = (): IpkModelConfig => ({
  version: "v1",
  updated_at: now(),
  models: {},
})

const read = async () => {
  await ensure()
  const raw = await Bun.file(file())
    .json()
    .catch(() => undefined)
  const item = IpkModelConfig.safeParse(raw)
  if (item.success) return item.data
  const next = empty()
  await writeText(file(), JSON.stringify(next, null, 2))
  return next
}

const write = async (models: IpkModelMap) => {
  await ensure()
  const next: IpkModelConfig = {
    version: "v1",
    updated_at: now(),
    models,
  }
  await writeText(file(), JSON.stringify(next, null, 2))
  return next
}

const patch = async (partial: Partial<IpkModelMap>) => {
  const prev = await read()
  const next: IpkModelMap = {
    ...prev.models,
    ...partial,
  }
  return write(next)
}

const valid = async (ref: IpkModelRef) =>
  Provider.getModel(ProviderID.make(ref.providerID), ModelID.make(ref.modelID))
    .then(() => true)
    .catch(() => false)

export namespace IpkModel {
  export async function get() {
    return read()
  }

  export async function set(partial: Partial<IpkModelMap>) {
    const rows = Object.entries(partial) as Array<[IpkModelKind, IpkModelRef | undefined]>
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

  export async function pick(kind: IpkModelKind, override?: IpkModelRef) {
    const ref = override ?? (await get()).models[kind]
    if (ref) {
      return Provider.getModel(ProviderID.make(ref.providerID), ModelID.make(ref.modelID)).catch(() => undefined)
    }
    const base = await Provider.defaultModel().catch(() => undefined)
    if (!base) return
    return Provider.getModel(base.providerID, base.modelID).catch(() => undefined)
  }
}
