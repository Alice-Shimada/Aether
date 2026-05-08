import z from "zod"
import { Identifier } from "@/id/id"

const habit_scope = ["global", "subject", "initiative", "task_scope", "artifact"] as const

export const HabitScopeLevel = z.enum(habit_scope)

export const WorkspaceLayer = z.enum(["global", "project", "session"])

export const ScopeLevel = z.enum(habit_scope)
export const RuntimeScopeLevel = z.enum([...habit_scope, "session"])

export const ScopeRef = z.object({
  level: RuntimeScopeLevel,
  target: z.string().min(1),
})

export const HabitScopeRef = z.object({
  level: HabitScopeLevel,
  target: z.string().min(1),
})

export const PolicyImpact = z.enum(["low", "medium", "high"])

export const PolicyLine = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  impact: PolicyImpact.default("low"),
  source: z.string().optional(),
  confirmed: z.boolean().optional(),
  updated_at: z.string().optional(),
})

export const PolicyRecord = z.object({
  scope: HabitScopeRef,
  response_policy: z.array(PolicyLine).default([]),
  operation_policy: z.array(PolicyLine).default([]),
  updated_at: z.string(),
})

export const InitiativePolicy = z.object({
  version: z.literal("v1").default("v1"),
  initiative_id: z.string(),
  updated_at: z.string(),
  response_policy: z.array(PolicyLine).default([]),
  operation_policy: z.array(PolicyLine).default([]),
})

export const GlobalGuidance = z.object({
  version: z.literal("v1").default("v1"),
  updated_at: z.string(),
  summary: z.string().default(""),
  stable_context: z.array(z.string()).default([]),
  subject_ids: z.array(z.string()).default([]),
  task_scope_refs: z.array(z.string()).default([]),
  artifact_refs: z.array(z.string()).default([]),
  ipk_piece_refs: z.array(z.string()).default([]),
})

export const SubjectProfile = z.object({
  version: z.literal("v1").default("v1"),
  subject_id: z.string(),
  updated_at: z.string(),
  summary: z.string().default(""),
  aliases: z.array(z.string()).default([]),
  known_anchors: z.array(z.string()).default([]),
  preferred_formalisms: z.array(z.string()).default([]),
  response_preferences: z.record(z.string(), z.number()).default({}),
  confidence: z.number().min(0).max(1).default(0),
  derived_from: z.array(z.string()).default([]),
})

export const ProjectGuidance = z.object({
  version: z.literal("v1").default("v1"),
  project_id: z.string(),
  updated_at: z.string(),
  summary: z.string().default(""),
  stable_context: z.array(z.string()).default([]),
  subject_ids: z.array(z.string()).default([]),
  task_scope_refs: z.array(z.string()).default([]),
  artifact_refs: z.array(z.string()).default([]),
  ipk_piece_refs: z.array(z.string()).default([]),
})

export const InitiativeProfile = z.object({
  version: z.literal("v1").default("v1"),
  initiative_id: z.string(),
  updated_at: z.string(),
  summary: z.string().default(""),
  stable_context: z.array(z.string()).default([]),
  subject_ids: z.array(z.string()).default([]),
  task_scope_refs: z.array(z.string()).default([]),
  artifact_refs: z.array(z.string()).default([]),
  ipk_piece_refs: z.array(z.string()).default([]),
})

export const SignalEvidence = z.object({
  source: z.enum(["user_message", "assistant_message", "tool", "summary", "manual"]).default("manual"),
  ref: z.string().min(1),
  quote: z.string().min(1),
})

export const SignalRecord = z.object({
  id: Identifier.schema("signal"),
  session_id: Identifier.schema("session"),
  created_at: z.string(),
  scope: ScopeRef,
  kind: z.string().min(1),
  polarity: z.enum(["positive", "negative", "neutral"]).default("neutral"),
  confidence: z.number().min(0).max(1),
  impact: PolicyImpact.default("low"),
  explicit: z.boolean().default(false),
  temporary: z.boolean().default(false),
  stability: z.enum(["stable", "mutable", "transient"]).default("stable"),
  traits: z.array(z.string()).default([]),
  evidence: z.array(SignalEvidence).min(1),
  note: z.string().default(""),
})

export const SummaryPattern = z.object({
  kind: z.string().min(1),
  strength: z.number().min(0).max(1),
  evidence_count: z.number().int().nonnegative().default(0),
  session_count: z.number().int().nonnegative().default(0),
  explicit_count: z.number().int().nonnegative().default(0),
  stability: z.enum(["stable", "mutable", "transient"]).default("stable"),
  signal_ids: z.array(z.string()).default([]),
  sample: z.string().default(""),
})

export const SummaryRecord = z.object({
  id: Identifier.schema("summary"),
  created_at: z.string(),
  updated_at: z.string(),
  window: z.object({
    start: z.string(),
    end: z.string(),
  }),
  scope: HabitScopeRef,
  session_ids: z.array(Identifier.schema("session")).default([]),
  signal_ids: z.array(Identifier.schema("signal")).default([]),
  highlights: z.array(z.string()).default([]),
  patterns: z.array(SummaryPattern).default([]),
  recommendations: z.array(z.string()).default([]),
})

export const PromotionInfo = z.object({
  source_scope: ScopeRef,
  target_scope: ScopeRef,
  kind: z.string().default("scope_promotion"),
  reason: z.string().default(""),
})

export const ProposalScopeChoice = z.object({
  suggested: ScopeRef.optional(),
  selected: ScopeRef.optional(),
  decided_by: z.enum(["system", "user"]).default("system"),
  reason: z.string().default(""),
})

export const HabitRelation = z.object({
  kind: z.enum([
    "derived_from",
    "promotes_from",
    "supersedes",
    "redirects_to",
    "used_with",
    "specializes",
    "generalizes",
    "conflicts_with",
    "suppressed_in",
  ]),
  from: ScopeRef.optional(),
  to: ScopeRef.optional(),
  ref: z.string().optional(),
  note: z.string().default(""),
  created_at: z.string(),
})

export const ProposalStatus = z.enum(["pending", "confirmed", "rejected", "deferred"])

export const SessionReview = z.object({
  session_id: Identifier.schema("session"),
  mode: z.enum(["suggest_add", "suggest_keep_attention", "suggest_remove", "suggest_replace", "suggest_rescope"]),
  habit_id: z.string().min(1),
  habit_scope: HabitScopeRef.optional(),
  replacement_id: z.string().optional(),
  reason: z.string().default(""),
})

export const ProposalRecord = z.object({
  id: Identifier.schema("proposal"),
  project_id: z.string().optional(),
  initiative_id: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  scope: ScopeRef,
  kind: z.string().min(1),
  merge_key: z.string().min(1),
  summary: z.string().min(1),
  impact: PolicyImpact.default("medium"),
  confidence: z.number().min(0).max(1),
  evidence_refs: z.array(z.string()).default([]),
  merged_from: z.array(z.string()).default([]),
  promotion: PromotionInfo.optional(),
  scope_choice: ProposalScopeChoice.optional(),
  relations: z.array(HabitRelation).default([]),
  session_review: SessionReview.optional(),
  target_patch: z
    .object({
      object: z.enum([
        "global_guidance",
        "global_policy",
        "subject_profile",
        "subject_policy",
        "project_guidance",
        "initiative_profile",
        "initiative_policy",
        "task_scope",
        "task_scope_policy",
        "artifact_contract",
      ]),
      id: z.string(),
      fields: z.array(z.string()).default([]),
      payload: z.record(z.string(), z.unknown()).default({}),
    })
    .optional(),
  future_effect: z.string().default(""),
  status: ProposalStatus,
  review_note: z.string().optional(),
  cooldown_until: z.string().optional(),
})

export const ContextSection = z.object({
  kind: z.enum([
    "global_guidance",
    "subject_profile",
    "project_guidance",
    "initiative_profile",
    "task_scope",
    "artifact_contract",
    "response_policy",
    "operation_policy",
  ]),
  source: z.string(),
  id: z.string(),
  text: z.string(),
})

export const ContextPacket = z.object({
  id: Identifier.schema("packet"),
  request_id: z.string(),
  session_id: Identifier.schema("session"),
  project_id: z.string(),
  initiative_id: z.string().optional(),
  task_scope_id: z.string().optional(),
  subject_ids: z.array(z.string()).default([]),
  artifact_ids: z.array(z.string()).default([]),
  habit_ids: z.array(z.string()).default([]),
  scratch_ids: z.array(z.string()).default([]),
  sections: z.array(ContextSection).default([]),
  audit: z.object({
    used_records: z.array(z.string()).default([]),
    omitted_reason: z.array(z.string()).default([]),
  }),
  created_at: z.string(),
})

export const HabitSurface = z.object({
  id: z.string(),
  legacy_ids: z.array(z.string()).default([]),
  scope: HabitScopeRef,
  kind: z.string(),
  title: z.string(),
  summary: z.string(),
  triggers: z.array(z.string()).default([]),
  priority: z.number().default(0),
  impact: PolicyImpact.default("low"),
  confidence: z.number().min(0).max(1).default(0),
  confirmed: z.boolean().default(false),
  target_ref: z.object({
    object: z.string(),
    path: z.string(),
    fields: z.array(z.string()).default([]),
  }),
})

export const HabitView = HabitSurface

export const ScratchState = z.enum(["pending", "active", "superseded", "invalidated", "promoted", "discarded"])
export const ScratchConfidence = z.enum(["low", "medium", "high"])
export const CandidateState = z.enum(["active", "pending"])
export const ComparisonRelation = z.enum(["none", "overlap", "conflict"])
export const ConflictKind = z.enum(["full", "partial"])
export const EvidenceSource = z.enum(["user_message", "review_input"])
export const EvidenceRole = z.enum(["user"])
export const JumpScope = z.enum(["session_local"])

export const ScratchEvidence = z.object({
  evidence_id: z.string().min(1),
  session_id: Identifier.schema("session"),
  message_id: Identifier.schema("message").optional(),
  quote: z.string().min(1),
  reason: z.string().default(""),
  source: EvidenceSource.default("user_message"),
  source_role: EvidenceRole.default("user"),
  jump_scope: JumpScope.default("session_local"),
  start_offset: z.number().int().nonnegative().optional(),
  end_offset: z.number().int().nonnegative().optional(),
  created_at: z.string(),
})

export const ExtractedHabitCandidate = z.object({
  candidate_id: z.string().min(1),
  summary: z.string().min(1),
  canonical_text: z.string().min(1),
  state_suggestion: CandidateState.default("active"),
  kind: z.string().min(1),
  impact: PolicyImpact.default("medium"),
  explicit: z.boolean().default(false),
  temporary: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0.5),
  scope_hint: z.string().default("session"),
  traits: z.array(z.string()).default([]),
  evidence: z.array(ScratchEvidence).min(1),
})

const HabitComparisonBase = z.object({
  relation: ComparisonRelation.default("none"),
  conflict_kind: ConflictKind.nullable().default(null),
  comparison_summary: z.string().default(""),
})

export const ImportedHabitComparison = HabitComparisonBase.extend({
  habit_id: z.string().min(1),
  habit_number: z.number().int().positive(),
})

export const ScratchHabitComparison = HabitComparisonBase.extend({
  scratch_id: z.string().min(1),
  scratch_number: z.number().int().positive(),
  merged_summary: z.string().optional(),
  merged_canonical_text: z.string().optional(),
})

export const ImportedHabitHit = z.object({
  id: z.string().min(1),
  session_id: Identifier.schema("session"),
  habit_id: z.string().min(1),
  candidate_id: z.string().min(1),
  summary: z.string().min(1),
  canonical_text: z.string().min(1),
  evidence: z.array(ScratchEvidence).default([]),
  comparison_summary: z.string().default(""),
  created_at: z.string(),
})

export const ScratchReviewTarget = z.object({
  target_kind: z.enum(["imported", "scratch"]),
  target_id: z.string().min(1),
  target_number: z.number().int().positive(),
  conflict_kind: ConflictKind.nullable().default(null),
  comparison_summary: z.string().default(""),
})

export const ScratchReviewKind = z.enum(["imported_conflict", "scratch_conflict"])
export const ScratchReviewStatus = z.enum([
  "pending",
  "resolved_keep_existing",
  "resolved_adopt_candidate",
  "resolved_adopt_custom",
])

export const ScratchReviewBatch = z.object({
  id: z.string().min(1),
  project_id: z.string(),
  session_id: Identifier.schema("session"),
  kind: ScratchReviewKind,
  candidate: ExtractedHabitCandidate,
  scratch_id: z.string().optional(),
  targets: z.array(ScratchReviewTarget).default([]),
  status: ScratchReviewStatus.default("pending"),
  resolution_note: z.string().optional(),
  resolution_text: z.string().optional(),
  resolved_scratch_id: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const ScratchHabit = z.object({
  id: z.string().min(1),
  project_id: z.string(),
  session_id: Identifier.schema("session"),
  candidate_id: z.string().optional(),
  state: ScratchState.default("active"),
  kind: z.string().min(1),
  summary: z.string().min(1),
  canonical_text: z.string().min(1),
  text: z.string().min(1),
  text_norm: z.string().min(1),
  impact: PolicyImpact.default("medium"),
  explicit: z.boolean().default(false),
  temporary: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0.5),
  scope_hint: z.string().default("session"),
  traits: z.array(z.string()).default([]),
  capture_confidence: ScratchConfidence.default("high"),
  capture_reason: z.string().default("用户明确表达了当前 session 需要遵守的工作习惯。"),
  evidence: z.array(ScratchEvidence).default([]),
  merged_from: z.array(z.string()).default([]),
  shadow_ids: z.array(z.string()).default([]),
  conflicts: z.array(z.string()).default([]),
  superseded_by: z.string().optional(),
  note: z.string().optional(),
  promoted_proposal_id: Identifier.schema("proposal").optional(),
  promoted_habit_id: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const AdaptationStatusView = z.object({
  session_id: Identifier.schema("session"),
  project_id: z.string(),
  initiative_id: z.string().optional(),
  project_name: z.string().optional(),
  task_scope_id: z.string().optional(),
  subject_ids: z.array(z.string()).default([]),
  artifact_ids: z.array(z.string()).default([]),
  habit_ids: z.array(z.string()).default([]),
  scratch_count: z.number().int().nonnegative().default(0),
  scratch_active_count: z.number().int().nonnegative().default(0),
  scratch_pending_count: z.number().int().nonnegative().default(0),
  scratch_review_count: z.number().int().nonnegative().default(0),
  context_packet_id: Identifier.schema("packet").optional(),
  context_packet: ContextPacket.optional(),
  pending_count: z.number().int().nonnegative().default(0),
  used_records: z.array(z.string()).default([]),
  omitted_reason: z.array(z.string()).default([]),
  updated_at: z.string(),
})

export type ScopeLevel = z.infer<typeof ScopeLevel>
export type RuntimeScopeLevel = z.infer<typeof RuntimeScopeLevel>
export type ScopeRef = z.infer<typeof ScopeRef>
export type HabitScopeLevel = z.infer<typeof HabitScopeLevel>
export type HabitScopeRef = z.infer<typeof HabitScopeRef>
export type WorkspaceLayer = z.infer<typeof WorkspaceLayer>
export type PolicyLine = z.infer<typeof PolicyLine>
export type PolicyRecord = z.infer<typeof PolicyRecord>
export type InitiativePolicy = z.infer<typeof InitiativePolicy>
export type SignalRecord = z.infer<typeof SignalRecord>
export type SummaryRecord = z.infer<typeof SummaryRecord>
export type ProposalRecord = z.infer<typeof ProposalRecord>
export type ProposalStatus = z.infer<typeof ProposalStatus>
export type PromotionInfo = z.infer<typeof PromotionInfo>
export type ProposalScopeChoice = z.infer<typeof ProposalScopeChoice>
export type HabitRelation = z.infer<typeof HabitRelation>
export type SessionReview = z.infer<typeof SessionReview>
export type GlobalGuidance = z.infer<typeof GlobalGuidance>
export type SubjectProfile = z.infer<typeof SubjectProfile>
export type ProjectGuidance = z.infer<typeof ProjectGuidance>
export type InitiativeProfile = z.infer<typeof InitiativeProfile>
export type ContextPacket = z.infer<typeof ContextPacket>
export type ContextSection = z.infer<typeof ContextSection>
export type HabitSurface = z.infer<typeof HabitSurface>
export type HabitView = z.infer<typeof HabitView>
export type ScratchState = z.infer<typeof ScratchState>
export type ScratchConfidence = z.infer<typeof ScratchConfidence>
export type CandidateState = z.infer<typeof CandidateState>
export type ComparisonRelation = z.infer<typeof ComparisonRelation>
export type ConflictKind = z.infer<typeof ConflictKind>
export type ScratchHabit = z.infer<typeof ScratchHabit>
export type ExtractedHabitCandidate = z.infer<typeof ExtractedHabitCandidate>
export type ScratchEvidence = z.infer<typeof ScratchEvidence>
export type ImportedHabitComparison = z.infer<typeof ImportedHabitComparison>
export type ScratchHabitComparison = z.infer<typeof ScratchHabitComparison>
export type ImportedHabitHit = z.infer<typeof ImportedHabitHit>
export type ScratchReviewTarget = z.infer<typeof ScratchReviewTarget>
export type ScratchReviewKind = z.infer<typeof ScratchReviewKind>
export type ScratchReviewStatus = z.infer<typeof ScratchReviewStatus>
export type ScratchReviewBatch = z.infer<typeof ScratchReviewBatch>
export type AdaptationStatusView = z.infer<typeof AdaptationStatusView>
