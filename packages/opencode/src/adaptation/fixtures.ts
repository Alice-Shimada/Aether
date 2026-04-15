export type BaselineFixture = {
  id: string
  title: string
  expect: string
}

export const baselineFixtures = (): BaselineFixture[] => [
  { id: "fx_01", title: "initiative mapping", expect: "session can resolve Aether project to initiative mapping" },
  { id: "fx_02", title: "session binding", expect: "session binding can hold task_scope reference" },
  { id: "fx_03", title: "artifact hit", expect: "artifact path can be matched by /artifact/match" },
  { id: "fx_04", title: "initiative policy hit", expect: "planning request can read initiative policy" },
  { id: "fx_05", title: "subject hit", expect: "subject request can read subject profile" },
  { id: "fx_06", title: "global fallback", expect: "general request only uses limited global fallback" },
  { id: "fx_07", title: "pending excluded", expect: "pending proposal is excluded from context packet" },
  { id: "fx_08", title: "rejected cooldown", expect: "rejected proposal enters cooldown" },
  { id: "fx_09", title: "confirm apply", expect: "proposal confirm patches target policy/profile" },
  { id: "fx_10", title: "mirror update", expect: "json write regenerates markdown mirror" },
  { id: "fx_11", title: "index rebuild", expect: "indexes can be rebuilt from confirmed records" },
  { id: "fx_12", title: "path safety", expect: "path traversal and root escape are rejected" },
]
