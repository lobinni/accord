import { abi } from "genlayer-js";

import type { AppConfig } from "@/lib/genlayer/config";
import type { GenLayerClient } from "@/lib/genlayer/client";
import schema from "@/lib/genlayer/schema.json";

/**
 * The schema-first adapter: the only module that knows the contract's method
 * names, parameters and answer shapes. Every answer is checked at the boundary
 * before a component sees it, so a different contract at the configured
 * address fails loudly here instead of rendering nonsense. The deployed
 * method set is pinned by schema.json.
 */

export const PROTOCOL_VERSION = schema.protocol_version;
export const ACCORD_CONTRACT_FILE = "contracts/accord.py";

// ── vocabulary (mirrors contracts/accord.py) ────────────────────────────────

export const REQUEST_STATUSES = ["SUBMITTED", "PROPOSED", "FINALIZED", "CLOSED", "FAILED", "CANCELLED"] as const;
export const BOND_STATUSES = ["LOCKED", "REFUNDABLE", "REFUNDED"] as const;
export const RECONCILIATION_STATUSES = ["RESOLVED", "UNRESOLVED_CONFLICT", "UNRESOLVED_INSUFFICIENT"] as const;
export const AVAILABILITY = ["AVAILABLE", "MISSING", "UNAVAILABLE"] as const;
export const FRESHNESS = ["CURRENT", "STALE", "UNAVAILABLE", "CONFLICTING"] as const;
export const SOURCE_CLASSES = ["OFFICIAL", "INDEPENDENT", "DERIVED", "UNKNOWN"] as const;
export const DECLARABLE_CLASSES = ["OFFICIAL", "INDEPENDENT", "UNKNOWN"] as const;
export const EVIDENCE_STATUSES = ["SUPPORTING", "CONFLICTING", "UNCONTESTED", "NO_CLAIM", "EXCLUDED", "UNAVAILABLE"] as const;
export const RESULT_KINDS = ["CATEGORICAL", "BOOLEAN", "NUMERIC", "TEMPORAL"] as const;
export const POLICIES = ["MAJORITY", "THRESHOLD", "AUTHORITY_CONFIRMATION", "STRICT"] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type BondStatus = (typeof BOND_STATUSES)[number];
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];
export type Freshness = (typeof FRESHNESS)[number];
export type Availability = (typeof AVAILABILITY)[number];
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];
export type SourceClass = (typeof SOURCE_CLASSES)[number];
export type DeclaredClass = (typeof DECLARABLE_CLASSES)[number];
export type ResultKind = (typeof RESULT_KINDS)[number];
export type PolicyKind = (typeof POLICIES)[number];

export type SourceSpec = {
  source_id: string;
  url: string;
  origin: string;
  label: string;
  declared_class: DeclaredClass;
};

export type ResultTypeSpec =
  | { kind: "CATEGORICAL"; values: string[] }
  | { kind: "BOOLEAN" }
  | { kind: "NUMERIC"; unit: string; decimals: number; tolerance_bps: number }
  | { kind: "TEMPORAL" };

export type PolicySpec = {
  kind: PolicyKind;
  stale_contributes: boolean;
  min_groups?: number;
  min_confirmations?: number;
  threshold_bps?: number;
};

export type AccordTerms = {
  question: string;
  sources: SourceSpec[];
  result_type: ResultTypeSpec;
  policy: PolicySpec;
  observation_window_start: number;
  observation_window_end: number;
  freshness_requirement: number;
  validity_seconds: number;
};

export type AccordRequest = {
  accord_id: string;
  creator: string;
  question: string;
  terms: AccordTerms;
  observation_window_start: number;
  observation_window_end: number;
  freshness_requirement: number;
  validity_seconds: number;
  bond_required: string;
  bond_deposited: string;
  bond_status: BondStatus;
  status: RequestStatus;
  created_at: number;
  updated_at: number;
  current_state: string;
  latest_result_id: string;
  result_count: number;
  last_observed_at: number;
  refunded_amount: string;
  refunded_at: number;
};

export type EvidenceRow = {
  source_id: string;
  source_url: string;
  origin: string;
  declared_class: DeclaredClass;
  source_class: SourceClass;
  availability: Availability;
  retrieved_at: number;
  published_at: string;
  updated_at: string;
  freshness: Freshness;
  claim: string;
  claim_type: ResultKind;
  claim_value: string;
  derived_from: string;
  derived_quote: string;
  as_of_quote: string;
  evidence_status: EvidenceStatus;
};

export type GroupRecord = { group: string; source_ids: string[]; claim: string };

export type ResultRecord = {
  result_id: string;
  accord_id: string;
  round: number;
  status: "PROPOSED" | "FINALIZED";
  state: string;
  reconciliation_status: ReconciliationStatus;
  evidence_sufficient: boolean;
  supporting_sources: string[];
  conflicting_sources: string[];
  groups: GroupRecord[];
  summary: string;
  evidence: EvidenceRow[];
  observation_time: number;
  valid_until: number;
  finalized_at: number;
};

export type HistoryEntry = {
  accord_id: string;
  previous_state: string;
  new_state: string;
  result_id: string;
  finalized_at: number;
  kind: string;
};

export type ReturnedDeposit = { sender: string; amount: string; reason: string; at: number };

export type Page<T> = { total: number; offset: number; limit: number; items: T[] };

export type ProtocolInfo = {
  protocol_version: string;
  accord_count: number;
  total_bonded: string;
  transition_count: number;
  min_bond: string;
  max_bond: string;
  finality_delay_seconds: number;
};

export const REQUIRED_METHODS = {
  create_accord: ["question", "terms_json", "bond_required"],
  cancel_accord: ["accord_id"],
  observe_accord: ["accord_id"],
  finalize_result: ["accord_id"],
  expire_result: ["accord_id"],
  close_accord: ["accord_id"],
  refund_bond: ["accord_id"],
  get_protocol_info: [],
  get_accord: ["accord_id"],
  get_result: ["result_id"],
  get_results: ["accord_id", "offset", "limit"],
  get_history: ["accord_id", "offset", "limit"],
  list_accords: ["offset", "limit"],
  list_by_creator: ["creator", "offset", "limit"],
  list_transitions: ["offset", "limit"],
  get_returned_deposits: ["offset", "limit"],
  returned_for: ["sender", "offset", "limit"],
} as const;

/** The only payable method: the bond is the transaction value, never an argument. */
export const PAYABLE_METHODS = ["create_accord"] as const;

export type WriteMethod =
  | "create_accord"
  | "cancel_accord"
  | "observe_accord"
  | "finalize_result"
  | "expire_result"
  | "close_accord"
  | "refund_bond";
export type VerbMethod = Exclude<WriteMethod, "create_accord">;

// ── reading, checked at the boundary ────────────────────────────────────────

function fail(fn: string): never {
  throw new Error(`The contract's ${fn} answer did not match the ACCORD interface.`);
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const text = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown): number => (typeof v === "number" ? v : Number(text(v)) || 0);
const bool = (v: unknown): boolean => v === true || v === "true";
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function isMissing(err: unknown): boolean {
  return /does not exist/i.test(String((err as Error)?.message ?? err));
}

function toSourceSpec(v: unknown): SourceSpec {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    source_id: text(o.source_id),
    url: text(o.url),
    origin: text(o.origin),
    label: text(o.label),
    declared_class: (DECLARABLE_CLASSES as readonly string[]).includes(text(o.declared_class))
      ? (text(o.declared_class) as DeclaredClass)
      : "UNKNOWN",
  };
}

function toResultType(v: unknown): ResultTypeSpec {
  const o = (v ?? {}) as Record<string, unknown>;
  const kind = text(o.kind) as ResultKind;
  if (kind === "CATEGORICAL") return { kind, values: list(o.values).map(text) };
  if (kind === "NUMERIC")
    return { kind, unit: text(o.unit), decimals: num(o.decimals), tolerance_bps: num(o.tolerance_bps) };
  if (kind === "TEMPORAL") return { kind };
  return { kind: "BOOLEAN" };
}

function toPolicy(v: unknown): PolicySpec {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    kind: (POLICIES as readonly string[]).includes(text(o.kind)) ? (text(o.kind) as PolicyKind) : "MAJORITY",
    stale_contributes: bool(o.stale_contributes),
    min_groups: o.min_groups == null ? undefined : num(o.min_groups),
    min_confirmations: o.min_confirmations == null ? undefined : num(o.min_confirmations),
    threshold_bps: o.threshold_bps == null ? undefined : num(o.threshold_bps),
  };
}

export function toTerms(v: unknown): AccordTerms {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    question: text(o.question),
    sources: list(o.sources).map(toSourceSpec),
    result_type: toResultType(o.result_type),
    policy: toPolicy(o.policy),
    observation_window_start: num(o.observation_window_start),
    observation_window_end: num(o.observation_window_end),
    freshness_requirement: num(o.freshness_requirement),
    validity_seconds: num(o.validity_seconds),
  };
}

export function checkAccord(v: unknown, fn: string): AccordRequest {
  if (!isObject(v) || !isStr(v.accord_id) || !isStr(v.status) || !REQUEST_STATUSES.includes(v.status as RequestStatus))
    fail(fn);
  const o = v;
  return {
    accord_id: text(o.accord_id),
    creator: text(o.creator),
    question: text(o.question),
    terms: toTerms(o.terms),
    observation_window_start: num(o.observation_window_start),
    observation_window_end: num(o.observation_window_end),
    freshness_requirement: num(o.freshness_requirement),
    validity_seconds: num(o.validity_seconds),
    bond_required: text(o.bond_required),
    bond_deposited: text(o.bond_deposited),
    bond_status: (BOND_STATUSES as readonly string[]).includes(text(o.bond_status))
      ? (text(o.bond_status) as BondStatus)
      : "LOCKED",
    status: text(o.status) as RequestStatus,
    created_at: num(o.created_at),
    updated_at: num(o.updated_at),
    current_state: text(o.current_state),
    latest_result_id: text(o.latest_result_id),
    result_count: num(o.result_count),
    last_observed_at: num(o.last_observed_at),
    refunded_amount: text(o.refunded_amount),
    refunded_at: num(o.refunded_at),
  };
}

export function checkResult(v: unknown, fn: string): ResultRecord {
  if (!isObject(v) || !isStr(v.result_id) || !Array.isArray(v.evidence)) fail(fn);
  const o = v;
  return {
    result_id: text(o.result_id),
    accord_id: text(o.accord_id),
    round: num(o.round),
    status: text(o.status) === "FINALIZED" ? "FINALIZED" : "PROPOSED",
    state: text(o.state),
    reconciliation_status: text(o.reconciliation_status) as ReconciliationStatus,
    evidence_sufficient: bool(o.evidence_sufficient),
    supporting_sources: list(o.supporting_sources).map(text),
    conflicting_sources: list(o.conflicting_sources).map(text),
    groups: list(o.groups).map((g) => {
      const x = (g ?? {}) as Record<string, unknown>;
      return { group: text(x.group), source_ids: list(x.source_ids).map(text), claim: text(x.claim) };
    }),
    summary: text(o.summary),
    evidence: list(o.evidence).map((e) => {
      const x = (e ?? {}) as Record<string, unknown>;
      return {
        source_id: text(x.source_id),
        source_url: text(x.source_url),
        origin: text(x.origin),
        declared_class: "UNKNOWN" as DeclaredClass,
        source_class: (SOURCE_CLASSES as readonly string[]).includes(text(x.source_class))
          ? (text(x.source_class) as SourceClass)
          : "UNKNOWN",
        availability: (AVAILABILITY as readonly string[]).includes(text(x.availability))
          ? (text(x.availability) as Availability)
          : "UNAVAILABLE",
        retrieved_at: num(x.retrieved_at),
        published_at: text(x.published_at),
        updated_at: text(x.updated_at),
        freshness: (FRESHNESS as readonly string[]).includes(text(x.freshness))
          ? (text(x.freshness) as Freshness)
          : "UNAVAILABLE",
        claim: text(x.claim),
        claim_type: "CATEGORICAL" as ResultKind,
        claim_value: text(x.claim_value) || "NONE",
        derived_from: text(x.derived_from),
        derived_quote: text(x.derived_quote),
        as_of_quote: text(x.as_of_quote),
        evidence_status: (EVIDENCE_STATUSES as readonly string[]).includes(text(x.evidence_status))
          ? (text(x.evidence_status) as EvidenceStatus)
          : "UNAVAILABLE",
      };
    }),
    observation_time: num(o.observation_time),
    valid_until: num(o.valid_until),
    finalized_at: num(o.finalized_at),
  };
}

export function checkTransition(v: unknown, fn: string): HistoryEntry {
  if (!isObject(v) || !isStr(v.accord_id)) fail(fn);
  return {
    accord_id: text(v.accord_id),
    previous_state: text(v.previous_state),
    new_state: text(v.new_state),
    result_id: text(v.result_id),
    finalized_at: num(v.finalized_at),
    kind: text(v.kind),
  };
}

function checkPage<T>(v: unknown, fn: string, check: (x: unknown, fn: string) => T): Page<T> {
  if (!isObject(v) || !isNum(v.total) || !Array.isArray(v.items)) fail(fn);
  return { items: v.items.map((x) => check(x, fn)), total: v.total, offset: num(v.offset), limit: num(v.limit) };
}

export function accordAddress(config: AppConfig): `0x${string}` {
  return config.contractAddress;
}

async function view(c: GenLayerClient, cfg: AppConfig, functionName: string, args: unknown[]): Promise<unknown> {
  return c.readContract({ address: accordAddress(cfg), functionName, args: args as never[] });
}

export const reads = {
  async protocol(c: GenLayerClient, cfg: AppConfig): Promise<ProtocolInfo> {
    const v = await view(c, cfg, "get_protocol_info", []);
    if (!isObject(v) || !isStr(v.protocol_version)) fail("get_protocol_info");
    const o = v;
    return {
      protocol_version: text(o.protocol_version),
      accord_count: num(o.accord_count),
      total_bonded: text(o.total_bonded),
      transition_count: num(o.transition_count),
      min_bond: text(o.min_bond),
      max_bond: text(o.max_bond),
      finality_delay_seconds: num(o.finality_delay_seconds),
    };
  },
  accord: async (c: GenLayerClient, cfg: AppConfig, id: string) => checkAccord(await view(c, cfg, "get_accord", [id]), "get_accord"),
  result: async (c: GenLayerClient, cfg: AppConfig, id: string) => checkResult(await view(c, cfg, "get_result", [id]), "get_result"),
  results: async (c: GenLayerClient, cfg: AppConfig, id: string, offset = 0, limit = 50) =>
    checkPage(await view(c, cfg, "get_results", [id, offset, limit]), "get_results", checkResult),
  history: async (c: GenLayerClient, cfg: AppConfig, id: string, offset = 0, limit = 50) =>
    checkPage(await view(c, cfg, "get_history", [id, offset, limit]), "get_history", checkTransition),
  list: async (c: GenLayerClient, cfg: AppConfig, offset = 0, limit = 50) =>
    checkPage(await view(c, cfg, "list_accords", [offset, limit]), "list_accords", checkAccord),
  byCreator: async (c: GenLayerClient, cfg: AppConfig, who: string, offset = 0, limit = 50) =>
    checkPage(await view(c, cfg, "list_by_creator", [who.toLowerCase(), offset, limit]), "list_by_creator", checkAccord),
  transitions: async (c: GenLayerClient, cfg: AppConfig, offset = 0, limit = 50) =>
    checkPage(await view(c, cfg, "list_transitions", [offset, limit]), "list_transitions", checkTransition),
  returned: async (c: GenLayerClient, cfg: AppConfig, offset = 0, limit = 50): Promise<Page<ReturnedDeposit>> => {
    const v = await view(c, cfg, "get_returned_deposits", [offset, limit]);
    if (!isObject(v) || !isNum(v.total) || !Array.isArray(v.items)) fail("get_returned_deposits");
    return {
      items: v.items.map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        return { sender: text(o.sender), amount: text(o.amount), reason: text(o.reason), at: num(o.at) };
      }),
      total: v.total,
      offset: num(v.offset),
      limit: num(v.limit),
    };
  },
  returnedFor: async (c: GenLayerClient, cfg: AppConfig, who: string, offset = 0, limit = 20): Promise<Page<ReturnedDeposit>> => {
    const v = await view(c, cfg, "returned_for", [who.toLowerCase(), offset, limit]);
    if (!isObject(v) || !isNum(v.total) || !Array.isArray(v.items)) fail("returned_for");
    return {
      items: v.items.map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        return { sender: text(o.sender), amount: text(o.amount), reason: text(o.reason), at: num(o.at) };
      }),
      total: v.total,
      offset: num(v.offset),
      limit: num(v.limit),
    };
  },
};

/** Backwards-friendly alias: the same checked readers. */
export const views = reads;

// ── deployment validation ───────────────────────────────────────────────────

export type DeploymentCheck = { ok: true; version: string } | { ok: false; reason: string };

/** Does a contract schema expose every method this app calls, with the same
 * parameters in the same order, and exactly one payable method? */
export function checkSchema(contractSchema: unknown): string | null {
  const methods = (
    contractSchema as { methods?: Record<string, { params?: [string, string][]; payable?: boolean | null }> }
  )?.methods;
  if (!methods || typeof methods !== "object") return "No contract schema exists at the configured address.";
  for (const [name, params] of Object.entries(REQUIRED_METHODS)) {
    const m = methods[name];
    if (!m) return `The contract at the configured address has no ${name} method, so it is not ACCORD.`;
    const names = (m.params ?? []).map((p) => p[0]);
    if (names.join(",") !== (params as readonly string[]).join(",")) {
      return `The contract's ${name} method takes different parameters than ACCORD's.`;
    }
  }
  for (const [name, m] of Object.entries(methods)) {
    const payable = Boolean(m.payable);
    const expected = (PAYABLE_METHODS as readonly string[]).includes(name);
    if (payable !== expected)
      return `The contract's ${name} method ${payable ? "accepts" : "refuses"} value, unlike ACCORD's.`;
  }
  return null;
}

export async function validateDeployment(c: GenLayerClient, cfg: AppConfig): Promise<DeploymentCheck> {
  let contractSchema: unknown;
  try {
    const getter = (c as unknown as { getContractSchema?: (a: string) => Promise<unknown> }).getContractSchema;
    if (!getter) return { ok: false, reason: "This client cannot read a contract schema." };
    contractSchema = await getter.call(c, cfg.contractAddress);
  } catch {
    return { ok: false, reason: "No contract could be read at the configured address on this network." };
  }
  const problem = checkSchema(contractSchema);
  if (problem) return { ok: false, reason: problem };
  try {
    const info = await reads.protocol(c, cfg);
    if (!info.protocol_version.startsWith("ACCORD")) {
      return { ok: false, reason: "The contract at the configured address does not identify itself as ACCORD." };
    }
    return { ok: true, version: info.protocol_version };
  } catch {
    return { ok: false, reason: "The contract at the configured address did not answer as ACCORD." };
  }
}

// ── writing ─────────────────────────────────────────────────────────────────

export type Call = { functionName: WriteMethod; args: (string | number | bigint)[]; value: bigint };

export function createCall(question: string, termsJson: string, bondAtto: bigint): Call {
  // the bond is attached as the transaction's value, and named once as its term
  return { functionName: "create_accord", args: [question, termsJson, bondAtto], value: bondAtto };
}

export function actCall(method: VerbMethod, accordId: string): Call {
  return { functionName: method, args: [accordId], value: 0n };
}

/**
 * The reconciled check for a creation: either the protocol's request count
 * grew, or the deposit index grew — in which case the contract declined in
 * words and sent the bond straight back. Deliberately uses only the
 * container-list views (protocol info, returned deposits) that answer on
 * every deployment generation.
 */
export function accordCreated(c: GenLayerClient, cfg: AppConfig, creator: string, known: number, knownReturned: number) {
  return async (): Promise<boolean | string> => {
    try {
      const page = await reads.byCreator(c, cfg, creator, 0, 1);
      if (page.total > known) return true;
    } catch {
      /* fallback to protocol total */
    }
    try {
      const info = await reads.protocol(c, cfg);
      if (info.accord_count > known) return true;
    } catch {
      /* non-fatal */
    }
    try {
      const returned = await reads.returnedFor(c, cfg, creator, 0, 1);
      if (returned.total > knownReturned && returned.items[0]) {
        return `The contract did not create the request and sent the bond straight back: ${returned.items[0].reason}`;
      }
    } catch {
      /* non-fatal */
    }
    return false;
  };
}

/** The reconciled check for a verb: the request's own view reflects the act. */
export function accordReflected(
  c: GenLayerClient,
  cfg: AppConfig,
  accordId: string,
  matches: (r: AccordRequest) => boolean,
) {
  return async (): Promise<boolean | string> => {
    try {
      return matches(await reads.accord(c, cfg, accordId));
    } catch {
      return false;
    }
  };
}

/** Checks a verb performs against a request view, keyed by method. */
export function expectedAfter(method: VerbMethod, previous: AccordRequest): (r: AccordRequest) => boolean {
  switch (method) {
    case "observe_accord":
      return (r) => r.result_count > previous.result_count || r.last_observed_at > previous.last_observed_at;
    case "finalize_result":
      return (r) => r.status !== "PROPOSED";
    case "expire_result":
      return (r) => r.current_state === "EXPIRED";
    case "close_accord":
      return (r) => r.status === "CLOSED" || r.status === "FAILED";
    case "refund_bond":
      return (r) => r.bond_status === "REFUNDED";
    case "cancel_accord":
      return (r) => r.status === "CANCELLED";
  }
}

// ── the transactions behind the record (StudioNet's read-only listing) ───────

export type ChainTx = {
  hash: `0x${string}`;
  method: string;
  args: unknown[];
  status: string;
  execution: string;
  createdAt: string;
  /** GenLayer's consensus outcome, as recorded (for example MAJORITY_AGREE). */
  consensus: string;
  /** How the validators voted, as recorded: vote -> count. */
  votes: Record<string, number>;
};

type RawTx = {
  hash?: string;
  status?: string;
  statusName?: string;
  created_at?: string;
  data?: { calldata?: string };
  result_name?: string;
  consensus_data?: {
    leader_receipt?: { execution_result?: string }[] | { execution_result?: string };
    votes?: Record<string, string>;
  };
};

function base64Bytes(s: string): Uint8Array {
  const bin = atob(s);
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}

export function decodeTx(t: RawTx): ChainTx | null {
  if (!t.hash) return null;
  let method = "";
  let args: unknown[] = [];
  if (t.data?.calldata) {
    try {
      const decoded = abi.calldata.decode(base64Bytes(t.data.calldata)) as unknown;
      const get = (k: string) =>
        decoded instanceof Map ? decoded.get(k) : (decoded as Record<string, unknown>)?.[k];
      method = String(get("method") ?? "");
      const a = get("args");
      args = Array.isArray(a) ? a : [];
    } catch {
      return null;
    }
  }
  const lr = t.consensus_data?.leader_receipt;
  const leader = Array.isArray(lr) ? lr[0] : lr;
  const votes: Record<string, number> = {};
  for (const v of Object.values(t.consensus_data?.votes ?? {})) votes[v] = (votes[v] ?? 0) + 1;
  return {
    hash: t.hash as `0x${string}`,
    method,
    args,
    status: t.statusName ?? t.status ?? "",
    execution: leader?.execution_result ?? "",
    createdAt: t.created_at ?? "",
    consensus: t.result_name ?? "",
    votes,
  };
}

/**
 * StudioNet lists the transactions sent to an address. Each is decoded from
 * its own calldata, so the app can show the real transaction behind every
 * result and refund, whoever sent it. Only StudioNet offers this listing; it
 * is read-only and used for display, never to decide anything.
 */
export async function contractTransactions(cfg: AppConfig): Promise<ChainTx[]> {
  // the same-origin proxy in the browser; the network RPC elsewhere
  const endpoint = typeof window === "undefined" ? cfg.rpcUrl : "/api/rpc";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sim_getTransactionsForAddress",
      params: [cfg.contractAddress],
    }),
  });
  const out = (await res.json()) as { result?: RawTx[] };
  return (out.result ?? []).map(decodeTx).filter((t): t is ChainTx => t !== null);
}

/** A write took effect only when its leader succeeded and GenLayer accepted
 * it; an undetermined, cancelled or overturned round changed nothing. */
const TOOK_EFFECT = ["ACCEPTED", "READY_TO_FINALIZE", "FINALIZED"];
const effective = (t: ChainTx) => t.execution === "SUCCESS" && TOOK_EFFECT.includes(t.status);

export function transactionsFor(all: ChainTx[], accordId: string) {
  const mine = all
    .filter((t) => t.args[0] !== undefined && String(t.args[0]) === accordId && t.method !== "create_accord")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    observations: mine.filter((t) => t.method === "observe_accord" && effective(t)),
    finalizations: mine.filter((t) => t.method === "finalize_result" && effective(t)),
    closes: mine.filter((t) => t.method === "close_accord" && effective(t)),
    refund: mine.find((t) => t.method === "refund_bond" && effective(t)),
    all: mine,
  };
}

/** The observation transaction that recorded a result: the last one that took
 * effect and was sent no later than the result's own time (with two minutes'
 * slack for clock differences). Matched by time, never by position, so a round
 * that changed nothing cannot shift another round's votes onto this result. */
export function observationFor(observations: ChainTx[], proposedAt: number): ChainTx | undefined {
  const sent = (t: ChainTx) => Date.parse(t.createdAt) / 1000;
  return observations.filter((t) => effective(t) && Number.isFinite(sent(t)) && sent(t) <= proposedAt + 120).at(-1);
}

export { schema };
