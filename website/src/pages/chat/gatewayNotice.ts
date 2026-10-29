import type { ChatMessage } from '../../types'

import { i18nT } from '../../i18n/t'
import { isRetryNotice } from '../../lib/retryNotice'
import type { NoticeTone } from './NoticeCard'

/**
 * Localized copy for the status rows the chat gateway appends: the recovery
 * `error` cards (transient 5xx, connection lost, session busy, stalled turn or
 * tool, session stuck) and the empty-response and model-fallback `notice` rows.
 *
 * Each such row carries a structured wire token in `meta.notice`
 * (`TRANSIENT_NOTICE_*` in `src/kiro_crew/dashboard/chat_utils.py` and
 * `GATEWAY_NOTICE_*` in `src/kiro_crew/dashboard/gateway_notice.py`) and the
 * values its copy interpolates in `meta.notice_args`. The row's English content
 * is the fallback for channel mirrors, SSE readers and the model, and is never
 * shown here. The tokens below are WIRE VALUES, not copy: never translate them,
 * and keep them byte-identical to the Python constants
 * (`test/test_transient_notice_parity.py` pins both sides).
 */

/** How a family draws. */
type Card =
  /** A link the gateway already re-queued: a soft notice that settles once answered. */
  | 'pending'
  /** A red ErrorCard with localized text (and the host's Resume affordance). */
  | 'error'
  /** A soft NoticeCard in the family's tone. */
  | 'notice'

interface Family {
  /** The only row role the token means something on. */
  role: 'error' | 'notice'
  card: Card
  /** NoticeCard tone for `card: 'notice'`. */
  tone?: NoticeTone
}

/** `meta.notice` wire tokens → family. Mirrors the Python token constants. */
const NOTICE_FAMILIES = {
  transient_retrying: { role: 'error', card: 'pending' },
  transient_resuming: { role: 'error', card: 'pending' },
  transient_give_up: { role: 'error', card: 'error' },
  connection_lost_retrying: { role: 'error', card: 'error' },
  connection_lost_give_up: { role: 'error', card: 'error' },
  session_busy_retrying: { role: 'error', card: 'error' },
  session_busy_give_up: { role: 'error', card: 'error' },
  turn_stalled_recovering: { role: 'error', card: 'error' },
  turn_stalled_give_up: { role: 'error', card: 'error' },
  tool_stalled_recovering: { role: 'error', card: 'error' },
  tool_stalled_give_up: { role: 'error', card: 'error' },
  session_stuck: { role: 'error', card: 'error' },
  shared_runtime_restarting: { role: 'error', card: 'error' },
  empty_turn_give_up: { role: 'notice', card: 'notice', tone: 'info' },
  empty_turn_after_recovery: { role: 'notice', card: 'notice', tone: 'info' },
  empty_turn_after_work: { role: 'notice', card: 'notice', tone: 'info' },
  empty_turn_continuing: { role: 'notice', card: 'notice', tone: 'info' },
  empty_turn_continuing_after_work: { role: 'notice', card: 'notice', tone: 'info' },
  compaction_continuing: { role: 'notice', card: 'notice', tone: 'info' },
  model_access_fallback: { role: 'notice', card: 'notice', tone: 'warn' },
  model_unavailable: { role: 'notice', card: 'notice', tone: 'info' },
} as const satisfies Record<string, Family>

export type GatewayNoticeToken = keyof typeof NOTICE_FAMILIES

/** Copy per token. Literal keys so `check-i18n-keys.mjs` resolves every lookup. */
const COPY_KEY = {
  transient_retrying: 'pages.chat.transientNotice.retrying',
  transient_resuming: 'pages.chat.transientNotice.resuming',
  transient_give_up: 'pages.chat.transientNotice.give_up',
  connection_lost_retrying: 'pages.chat.gatewayNotice.connection_lost_retrying',
  connection_lost_give_up: 'pages.chat.gatewayNotice.connection_lost_give_up',
  session_busy_retrying: 'pages.chat.gatewayNotice.session_busy_retrying',
  session_busy_give_up: 'pages.chat.gatewayNotice.session_busy_give_up',
  turn_stalled_recovering: 'pages.chat.gatewayNotice.turn_stalled_recovering',
  turn_stalled_give_up: 'pages.chat.gatewayNotice.turn_stalled_give_up',
  tool_stalled_recovering: 'pages.chat.gatewayNotice.tool_stalled_recovering',
  tool_stalled_give_up: 'pages.chat.gatewayNotice.tool_stalled_give_up',
  session_stuck: 'pages.chat.gatewayNotice.session_stuck',
  shared_runtime_restarting: 'pages.chat.gatewayNotice.shared_runtime_restarting',
  empty_turn_give_up: 'pages.chat.gatewayNotice.empty_turn_give_up',
  empty_turn_after_recovery: 'pages.chat.gatewayNotice.empty_turn_after_recovery',
  empty_turn_after_work: 'pages.chat.gatewayNotice.empty_turn_after_work',
  empty_turn_continuing: 'pages.chat.gatewayNotice.empty_turn_continuing',
  empty_turn_continuing_after_work: 'pages.chat.gatewayNotice.empty_turn_continuing_after_work',
  compaction_continuing: 'pages.chat.gatewayNotice.compaction_continuing',
  model_access_fallback: 'pages.chat.gatewayNotice.model_access_fallback',
  model_unavailable: 'pages.chat.gatewayNotice.model_unavailable',
} as const satisfies Record<GatewayNoticeToken, string>

/** Copy for a row whose args carry a recovery ordinal (`n` of `max`). */
const COUNTED_KEY = {
  empty_turn_continuing: 'pages.chat.gatewayNotice.empty_turn_continuing_counted',
  empty_turn_continuing_after_work: 'pages.chat.gatewayNotice.empty_turn_continuing_after_work_counted',
} as const satisfies Partial<Record<GatewayNoticeToken, string>>

/**
 * Resume-worded copy for a terminal row that renders the Resume button, so the
 * banner speaks the same verb as the control (see `ErrorCard`).
 */
const RESUME_KEY = {
  connection_lost_give_up: 'pages.chat.errorCard.retry_connection_lost',
  session_busy_give_up: 'pages.chat.errorCard.retry_session_busy',
  turn_stalled_give_up: 'pages.chat.errorCard.retry_turn_stalled',
  tool_stalled_give_up: 'pages.chat.errorCard.retry_tool_stalled',
} as const satisfies Partial<Record<GatewayNoticeToken, string>>

const RESTORED_KEY = 'pages.chat.transientNotice.restored'
const INTERRUPTED_KEY = 'pages.chat.transientNotice.interrupted'
const BACKEND_HICCUP_RESUME_KEY = 'pages.chat.errorCard.retry_backend_hiccup'

type Args = Readonly<Record<string, unknown>>

interface Legacy {
  re: RegExp
  token: GatewayNoticeToken
  /** Terminal unless the row carries `kind = transient_retry`; then this pending token. */
  pendingWithRetryKind?: GatewayNoticeToken
  /**
   * True when this wording has Resume copy of its own (the closed "Backend
   * hiccup" give-up). Read by `resumeProseFor` only: the transcript resolver
   * words a token, not a wording.
   */
  hiccupResume?: true
}

/**
 * Rows persisted before their token existed carry only their English content and
 * are re-read from disk on every reload with no migration. ONE table recognises
 * every family's wording, pattern → token, and captures the values its copy
 * interpolates as named groups. A row WITH a token never consults it.
 *
 * The "Backend hiccup" wording is closed (nothing emits it), and classifies the
 * way its gateway did: a "retrying…" row has a recovery queued; a "recovering…"
 * row covers both outcomes and marks the re-queued one with
 * `meta.kind = transient_retry`; a "please retry." row is terminal.
 */
const LEGACY: readonly Legacy[] = [
  { re: /^⟳ Backend hiccup — retrying…$/u, token: 'transient_retrying' },
  { re: /^⟳ Backend hiccup — recovering…$/u, token: 'transient_give_up', pendingWithRetryKind: 'transient_resuming' },
  { re: /^⟳ Backend hiccup — please retry\.$/u, token: 'transient_give_up', hiccupResume: true },
  { re: /^⟳ Connection lost(?<detail> \(exit -?\d+\))? — retrying(?:…|\.\.\.)$/u, token: 'connection_lost_retrying' },
  { re: /^⟳ Connection lost(?<detail> \(exit -?\d+\))? — please retry\.$/u, token: 'connection_lost_give_up' },
  { re: /^⟳ Session busy — retrying…$/u, token: 'session_busy_retrying' },
  { re: /^⟳ Session busy — please retry\.$/u, token: 'session_busy_give_up' },
  { re: /^⟳ Recovering a stalled turn…$/u, token: 'turn_stalled_recovering' },
  { re: /^⟳ Turn stalled — please retry\.$/u, token: 'turn_stalled_give_up' },
  { re: /^⟳ Tool appeared stalled — recovering…$/u, token: 'tool_stalled_recovering' },
  { re: /^⟳ Tool appeared stalled — please retry\.$/u, token: 'tool_stalled_give_up' },
  { re: /^Session stuck(?<detail> \(exit -?\d+\))? — please start a new chat\.$/u, token: 'session_stuck' },
  {
    re: /^The agent process this chat shares kept restarting(?<detail> \(exit -?\d+\))? — please retry\.$/u,
    token: 'shared_runtime_restarting',
  },
  { re: /^ℹ\uFE0F? The model returned nothing this turn\. Just send your message again to continue\.$/u, token: 'empty_turn_give_up' },
  {
    re: /^ℹ\uFE0F? The model returned nothing this turn \(automatic recovery was attempted\)\. Just send your message again to continue\.$/u,
    token: 'empty_turn_after_recovery',
  },
  {
    re: /^ℹ\uFE0F? The turn ended without a closing reply\. Send a message to continue from where it stopped — completed steps will not re-run\.$/u,
    token: 'empty_turn_after_work',
  },
  { re: /^ℹ\uFE0F? The model returned nothing twice — auto-continuing once\.$/u, token: 'empty_turn_continuing' },
  {
    re: /^ℹ\uFE0F? The model returned nothing — auto-continuing \(recovery (?<n>\d+) of (?<max>\d+)\)\.$/u,
    token: 'empty_turn_continuing',
  },
  { re: /^ℹ\uFE0F? The turn ended without a closing reply — continuing once from what already ran\.$/u, token: 'empty_turn_continuing_after_work' },
  {
    re: /^ℹ\uFE0F? The turn ended without a closing reply — continuing from what already ran \(recovery (?<n>\d+) of (?<max>\d+)\)\.$/u,
    token: 'empty_turn_continuing_after_work',
  },
  {
    re: /^ℹ\uFE0F? The context was compacted mid-turn and the response stopped there — continuing automatically\.$/u,
    token: 'compaction_continuing',
  },
  {
    re: /^⚠\uFE0F? Your account cannot use model '(?<rejected>[^']*)' — running on '(?<model>[^']*)' instead\.$/u,
    token: 'model_access_fallback',
  },
  {
    re: /^(?<model>\S+) isn't offered right now — this session is running on auto instead\. Pick another model from the composer, or leave it: your model choice is kept and will be used automatically once it's offered again\.$/u,
    token: 'model_unavailable',
  },
]

interface Shape {
  token: GatewayNoticeToken
  args: Args
  hiccupResume?: true
}

function isToken(value: unknown): value is GatewayNoticeToken {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(NOTICE_FAMILIES, value)
}

function legacyShape(content: string, m?: ChatMessage): Shape | null {
  for (const entry of LEGACY) {
    const match = entry.re.exec(content)
    if (!match) continue
    const token = entry.pendingWithRetryKind && m && isRetryNotice(m) ? entry.pendingWithRetryKind : entry.token
    return { token, args: { ...(match.groups ?? {}) }, hiccupResume: entry.hiccupResume }
  }
  return null
}

function shapeOf(m: ChatMessage): Shape | null {
  const meta = m.meta as { notice?: unknown; notice_args?: unknown } | undefined
  const token = meta?.notice
  const shape: Shape | null = isToken(token)
    ? {
        token,
        args: meta?.notice_args && typeof meta.notice_args === 'object' ? (meta.notice_args as Args) : {},
      }
    : legacyShape((m.content ?? '').trim(), m)
  if (!shape || NOTICE_FAMILIES[shape.token].role !== m.role) return null
  return shape
}

/** Interpolation values for a family's copy, normalized from the row's args. */
function copyVars(args: Args): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [k, v] of Object.entries(args)) {
    if (typeof v === 'string' || typeof v === 'number') vars[k] = String(v)
  }
  // `detail` is the process exit code, ` (exit N)`, or nothing.
  if (vars.detail === undefined) vars.detail = vars.exit_code !== undefined ? ` (exit ${vars.exit_code})` : ''
  return vars
}

/** Resume-worded copy for a shape whose row offers Resume, or undefined when it has none. */
function resumeTextOf({ token, args, hiccupResume }: Shape): string | undefined {
  if (hiccupResume) return i18nT(BACKEND_HICCUP_RESUME_KEY, copyVars(args))
  if (!(token in RESUME_KEY)) return undefined
  return i18nT(RESUME_KEY[token as keyof typeof RESUME_KEY], copyVars(args))
}

function copyOf({ token, args }: Shape): string {
  const vars = copyVars(args)
  if (token in COUNTED_KEY && vars.n !== undefined && vars.max !== undefined) {
    return i18nT(COUNTED_KEY[token as keyof typeof COUNTED_KEY], vars)
  }
  return i18nT(COPY_KEY[token], vars)
}

/**
 * True for a PENDING link of the transient-5xx ladder — the gateway has already
 * re-queued the turn and nothing is asked of the person. A crewmate's chat
 * drops these rows (`components/chat/crewmateBubbles`): routine recovery is the
 * runtime's own machinery, and a patrolling crewmate otherwise stacks one
 * "Connection restored" card per retried wake with no message of its own
 * between them. The terminal give-up is NOT pending: it is the one shape where
 * the person must act, and it keeps drawing everywhere.
 */
export function isPendingTransientNotice(m: ChatMessage): boolean {
  if (m.role !== 'error') return false
  const shape = shapeOf(m)
  return shape !== null && NOTICE_FAMILIES[shape.token].card === 'pending'
}

export type GatewayNotice =
  | {
      /**
       * Drawn as a soft NoticeCard in the given tone: a pending retry the
       * gateway already queued (warn while pending; info once the recovery
       * window has closed, reading "restored" or "interrupted"), or a routine
       * notice row.
       */
      card: 'notice'
      text: string
      tone: NoticeTone
    }
  | {
      /**
       * The person has to act (or the family keeps its red card): the row keeps
       * the ErrorCard, and with it the Continue affordance the host may attach.
       * `resumeText` is the same notice worded for a row that offers Resume.
       */
      card: 'error'
      text: string
      resumeText?: string
    }

/** How THIS recovery ended, as far as the transcript below the notice shows. */
type Outcome = 'answered' | 'failed' | 'pending'

/**
 * Scan the rows after this notice, within THIS recovery only.
 *
 * - `answered`: an assistant (or live streaming) row proves the model answered
 *   again.
 * - `failed`: the window closed without an answer: an `error` row that is
 *   neither a pending link of the same ladder nor another re-queued recovery
 *   row (`kind: transient_retry`), such as the terminal give-up or any other ❌.
 * - `pending`: no row has decided the outcome yet. A `user` row stops the scan
 *   without settling: a message typed during the backoff is written at send
 *   time while the re-queued replay still runs, so it proves neither outcome.
 *
 * Other roles (tool, notice…) are transparent.
 */
function outcomeAfter(messages: readonly ChatMessage[], index: number): Outcome {
  for (let j = index + 1; j < messages.length; j++) {
    const row = messages[j]
    const r = row.role
    if (r === 'assistant' || r === 'streaming') return 'answered'
    if (r === 'user') return 'pending'
    if (r === 'error') {
      const later = shapeOf(row)
      if (later && NOTICE_FAMILIES[later.token].card === 'pending') continue
      if (isRetryNotice(row)) continue
      return 'failed'
    }
  }
  return 'pending'
}

/**
 * Resolve a gateway status row into localized copy, or null when the row is not
 * one (any other row keeps its verbatim prose).
 *
 * A pending row is tense-aware. The gateway appends nothing when the re-queued
 * turn succeeds, so on its own the row would read "retrying…" in a transcript
 * whose answer already sits below it; when a later assistant row exists WITHIN
 * the same recovery the same card reads "Connection restored" instead. A later
 * ERROR row never settles it to "restored" — the ladder may have given up — and
 * it CLOSES the window: the card settles to a muted, past-tense "Connection
 * interrupted", and an answer to a later, unrelated turn never flips it to
 * "restored". A new user turn stops the scan without settling either way (see
 * `outcomeAfter`). Every other family never settles.
 */
export function resolveGatewayNotice(
  m: ChatMessage,
  messages: readonly ChatMessage[],
  index: number,
): GatewayNotice | null {
  if (m.role !== 'error' && m.role !== 'notice') return null
  const shape = shapeOf(m)
  if (!shape) return null
  const family: Family = NOTICE_FAMILIES[shape.token]
  if (family.card === 'notice') return { card: 'notice', text: copyOf(shape), tone: family.tone ?? 'info' }
  if (family.card === 'error') {
    // Worded by token alone: a wording's own Resume copy is for `resumeProseFor`.
    const resumeText = resumeTextOf({ token: shape.token, args: shape.args })
    return { card: 'error', text: copyOf(shape), ...(resumeText ? { resumeText } : {}) }
  }
  const outcome = outcomeAfter(messages, index)
  if (outcome === 'answered') return { card: 'notice', text: i18nT(RESTORED_KEY), tone: 'info' }
  if (outcome === 'failed') return { card: 'notice', text: i18nT(INTERRUPTED_KEY), tone: 'info' }
  return { card: 'notice', text: copyOf(shape), tone: 'warn' }
}

/**
 * Resume-worded copy for gateway retry prose, or `null` for anything else. Reads
 * the same legacy table, so a row the resolver did not see (a host passing raw
 * content straight to `ErrorCard`) still speaks the Resume verb.
 */
export function resumeProseFor(content: string): string | null {
  const shape = legacyShape(content)
  return shape ? (resumeTextOf(shape) ?? null) : null
}
