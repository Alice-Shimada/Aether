import fs from "fs/promises"
import z from "zod"
import { AppIdentity } from "./identity"
import { MemoryPath } from "./path"

export const MemoryImport = z.object({
  kind: z.enum(["ipk", "adaptation"]),
  source: z.string(),
  imported_at: z.string(),
  version: z.string(),
  strategy: z.literal("copy-only"),
})

export const MemoryManifestRecord = z.object({
  version: z.literal("v1"),
  root: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  identity: z.object({
    product_name: z.string(),
    env_prefix: z.string(),
    memory_namespace: z.string(),
    legacy_storage_names: z.array(z.string()),
  }),
  imports: z.array(MemoryImport),
})

export type MemoryImport = z.infer<typeof MemoryImport>
export type MemoryManifestRecord = z.infer<typeof MemoryManifestRecord>

const now = () => new Date().toISOString()

const fresh = (): MemoryManifestRecord => {
  const stamp = now()
  return {
    version: "v1",
    root: MemoryPath.root(),
    created_at: stamp,
    updated_at: stamp,
    identity: {
      product_name: AppIdentity.productName,
      env_prefix: AppIdentity.envPrefix,
      memory_namespace: AppIdentity.memoryNamespace,
      legacy_storage_names: [...AppIdentity.legacyStorageNames],
    },
    imports: [],
  }
}

const file = () => MemoryPath.child(MemoryPath.root(), "manifest.json")

const store = async (item: MemoryManifestRecord) => {
  await fs.mkdir(MemoryPath.root(), { recursive: true })
  await MemoryPath.assertFile(MemoryPath.root(), file())
  const tmp = MemoryPath.child(MemoryPath.root(), `.manifest.${process.pid}.${Date.now()}.tmp`)
  await MemoryPath.assertFile(MemoryPath.root(), tmp)
  await Bun.write(tmp, JSON.stringify(item, null, 2))
  await fs.rename(tmp, file())
  return item
}

export namespace MemoryManifest {
  export function path() {
    return file()
  }

  export async function read() {
    const raw: unknown = await Bun.file(file())
      .json()
      .catch(() => undefined)
    const item = MemoryManifestRecord.safeParse(raw)
    if (item.success) return item.data
    return
  }

  export async function ensure() {
    const item = await read()
    if (item) return item
    return store(fresh())
  }

  export async function record(input: MemoryImport) {
    const item = await ensure()
    return store({
      ...item,
      updated_at: now(),
      imports: [...item.imports, input],
    })
  }
}
