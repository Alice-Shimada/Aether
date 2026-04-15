export const AppIdentity = {
  productName: "Aether",
  envPrefix: "AETHER",
  memoryNamespace: "aether-memory",
  legacyStorageNames: ["opencode"],
} as const

export const MemoryEnv = {
  home: `${AppIdentity.envPrefix}_MEMORY_HOME`,
} as const
