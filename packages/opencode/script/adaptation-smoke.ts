#!/usr/bin/env bun

type Row = Record<string, unknown>

const arg = (name: string, fallback = "") => {
  const idx = Bun.argv.indexOf(name)
  if (idx < 0) return fallback
  return Bun.argv[idx + 1] ?? fallback
}

const base = arg("--base", process.env.AETHER_SMOKE_BASE || "http://127.0.0.1:4096")
const dir = arg("--dir", process.env.AETHER_SMOKE_DIR || process.cwd())
const user = arg("--user", process.env.AETHER_SMOKE_USER || process.env.OPENCODE_SERVER_USERNAME || "")
const pass = arg("--pass", process.env.AETHER_SMOKE_PASS || process.env.OPENCODE_SERVER_PASSWORD || "")

const header = (): Record<string, string> => {
  if (!pass) return { "Content-Type": "application/json" }
  const raw = Buffer.from(`${user || "opencode"}:${pass}`).toString("base64")
  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${raw}`,
  }
}

const fail = (msg: string): never => {
  console.error(`FAIL: ${msg}`)
  process.exit(1)
  throw new Error(msg)
}

const ok = (msg: string) => {
  console.log(`PASS: ${msg}`)
}

const has = (x: unknown): x is Row => Boolean(x && typeof x === "object")

const call = async (method: string, path: string, body?: unknown) => {
  const sep = path.includes("?") ? "&" : "?"
  const url = `${base}${path}${sep}directory=${encodeURIComponent(dir)}`
  const res = await fetch(url, {
    method,
    headers: header(),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text().catch(() => "")
  const json = text ? JSON.parse(text) : undefined
  if (!res.ok) fail(`${method} ${path} -> ${res.status} ${text}`)
  return json
}

const pick = <T extends string>(row: Row, key: T) => {
  const val = row[key]
  if (typeof val === "string" && val) return val
  return fail(`missing ${key}`)
}

const list = (val: unknown) => (Array.isArray(val) ? val : [])

const main = async () => {
  const health = await call("GET", "/adaptation/health")
  if (!has(health) || health.ok !== true) fail("adaptation health is not ok")
  ok("adaptation route is available")

  const ses = await call("POST", "/session", {})
  if (!has(ses)) fail("session create failed")
  const sid = pick(ses, "id")
  ok(`session created: ${sid}`)

  const status = await call("GET", `/adaptation/status?session_id=${encodeURIComponent(sid)}`)
  if (!has(status)) fail("adaptation status failed")
  const pid = pick(status, "project_id")
  ok(`project mapping resolved: ${pid}`)

  const scope = await call("POST", "/task-scope", {
    project_id: pid,
    title: "用户自适应系统 v1 实施",
    kind: "implementation",
    goal: "按实施指南推进并验证。",
  })
  if (!has(scope)) fail("task scope create failed")
  const scid = pick(scope, "id")
  ok(`task scope created: ${scid}`)

  await call("POST", `/task-scope/${encodeURIComponent(scid)}/bind-session`, {
    session_id: sid,
    project_id: pid,
  })
  ok("task scope bound to session")

  const art = await call("POST", "/artifact", {
    project_id: pid,
    task_scope_id: scid,
    role: "open_questions",
    path: "docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md",
    format: "markdown",
    write_mode: "revise_in_place",
    preview_confirmed: true,
    update_triggers: ["on_planning_question_added"],
  })
  if (!has(art)) fail("artifact create failed")
  const aid = pick(art, "id")
  ok(`artifact created: ${aid}`)

  const match = await call("POST", "/task-scope/match", {
    session_id: sid,
    request: "请继续用户自适应系统实现，并同步 open-questions。",
    open_paths: ["docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md"],
  })
  if (!has(match)) fail("scope match failed")
  ok("scope matching returned result")

  const pre = await call("POST", "/adaptation/context/compile", {
    session_id: sid,
    request_id: `req_${Date.now()}`,
    request: "请继续用户自适应系统实现",
    budget: { max_sections: 8, max_chars: 4000 },
  })
  if (!has(pre)) fail("context compile failed")
  const packet = has(pre.packet) ? (pre.packet as Row) : undefined
  if (!packet) fail("context packet missing")
  ok("context packet compiled")

  const cand = {
    project_id: pid,
    scope: {
      level: "task_scope",
      target: scid,
    },
    kind: "workflow_principle",
    merge_key: `task_scope:${scid}:planning_doc_sync`,
    summary: "项目规划讨论后，将已确认决策写入 decisions，未决写入 open-questions。",
    impact: "high",
    confidence: 0.91,
    evidence_refs: ["sig_demo_1"],
    target_patch: {
      object: "task_scope_policy",
      id: scid,
      fields: ["operation_policy"],
      payload: {
        operation_policy: [
          {
            id: "pol_op_planning_doc_sync_demo",
            text: "项目规划讨论后，已确认写 decisions，未决写 open-questions。",
            impact: "high",
            source: "proposal_confirmed",
          },
        ],
      },
    },
    future_effect: "后续规划讨论会优先执行该记录规则。",
  }

  const merged = await call("POST", "/adaptation/proposals/merge", {
    proposals: [cand],
  })
  if (!has(merged)) fail("proposal merge failed")
  ok("proposal candidate merged into inbox")

  const pend = await call("GET", "/adaptation/proposals?status=pending")
  const rows = list(pend)
  if (rows.length < 1) fail("pending proposal not found")
  const prop = has(rows[0]) ? (rows[0] as Row) : undefined
  const prid = pick(prop ?? fail("pending proposal payload invalid"), "id")
  ok(`pending proposal available: ${prid}`)

  const mid = await call("POST", "/adaptation/context/compile", {
    session_id: sid,
    request_id: `req_mid_${Date.now()}`,
    request: "继续推进",
    budget: { max_sections: 8, max_chars: 4000 },
  })
  if (!has(mid) || !has(mid.packet)) fail("mid context compile failed")
  const audit = has((mid.packet as Row).audit) ? ((mid.packet as Row).audit as Row) : {}
  const omit = list(audit.omitted_reason).map((x) => String(x))
  if (!omit.some((x) => x.includes("pending proposals are excluded"))) {
    fail("pending proposal exclusion note missing from context audit")
  }
  ok("pending proposal is excluded from active context")

  await call("POST", `/adaptation/proposals/${encodeURIComponent(prid)}/confirm`, {
    review_note: "同意",
    apply: true,
    session_id: sid,
  })
  ok("proposal confirm succeeded")

  const live = await call("GET", `/adaptation/status?session_id=${encodeURIComponent(sid)}`)
  if (!has(live) || !has(live.context_packet)) fail("confirmed context refresh missing from status")
  const liveSecs = list((live.context_packet as Row).sections)
  const liveText = liveSecs
    .filter((x): x is Row => has(x))
    .map((x) => String(x.text || ""))
    .join("\n")
  if (!liveText.includes("decisions") || !liveText.includes("open-questions")) {
    fail("confirmed rule not immediately visible in current status")
  }
  ok("confirmed proposal refreshes current context")

  const post = await call("POST", "/adaptation/context/compile", {
    session_id: sid,
    request_id: `req_post_${Date.now()}`,
    request: "继续推进",
    budget: { max_sections: 8, max_chars: 4000 },
  })
  if (!has(post) || !has(post.packet)) fail("post context compile failed")
  const secs = list((post.packet as Row).sections)
  const text = secs
    .filter((x): x is Row => has(x))
    .map((x) => String(x.text || ""))
    .join("\n")
  if (!text.includes("decisions") || !text.includes("open-questions")) {
    fail("confirmed rule not found in context sections")
  }
  ok("confirmed proposal is injected into context")

  const cand2 = {
    ...cand,
    merge_key: `task_scope:${scid}:another_rule`,
    summary: "以后都优先使用某工具",
    evidence_refs: ["sig_demo_2"],
  }
  const m2 = await call("POST", "/adaptation/proposals/merge", { proposals: [cand2] })
  if (!has(m2)) fail("second merge failed")
  const p2 = await call("GET", "/adaptation/proposals?status=pending")
  const r2 = list(p2).filter((x): x is Row => has(x))
  const x2 = r2.find((x) => String(x.merge_key || "").includes("another_rule"))
  const id2 = x2 ? String(x2.id) : fail("second pending proposal missing")
  await call("POST", `/adaptation/proposals/${encodeURIComponent(id2)}/defer`, { review_note: "稍后" })
  ok("proposal defer succeeded")

  const cand3 = {
    ...cand,
    merge_key: `task_scope:${scid}:third_rule`,
    summary: "以后默认自动执行危险操作",
    evidence_refs: ["sig_demo_3"],
  }
  await call("POST", "/adaptation/proposals/merge", { proposals: [cand3] })
  const p3 = await call("GET", "/adaptation/proposals?status=pending")
  const r3 = list(p3).filter((x): x is Row => has(x))
  const x3 = r3.find((x) => String(x.merge_key || "").includes("third_rule"))
  const id3 = x3 ? String(x3.id) : fail("third pending proposal missing")
  await call("POST", `/adaptation/proposals/${encodeURIComponent(id3)}/reject`, { review_note: "拒绝" })
  ok("proposal reject succeeded")

  const idx = await call("POST", "/adaptation/reindex")
  if (!has(idx)) fail("reindex failed")
  ok("derived indexes rebuilt")

  console.log("DONE: adaptation smoke flow passed")
  console.log(`session_id=${sid}`)
  console.log(`project_id=${pid}`)
  console.log(`task_scope_id=${scid}`)
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err))
})
