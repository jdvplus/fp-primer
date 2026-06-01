// ============================================================================
// schedule-post.ts - a realistic Result pipeline
// ----------------------------------------------------------------------------
// Scenario: schedule a social post.
//
// It can fail in several distinct, recoverable ways.
// We model each failure as a value, run a chain of small pure checks,
// short-circuit on the first failure, and handle every failure exhaustively at the boundary.
//
// The infrastructure calls (counts, account lookup, persistence) are FAKE,
// in-memory stand-ins so this runs standalone. When you adapt this for real work,
// those three functions are the only things you'd swap for actual I/O —
// notice they're the ONLY impure parts; everything else is pure.
// ============================================================================

import { ok, err, map, flatMap, type Result } from './result.ts'
import { assertNever } from './exhaustive.ts'

// ---- The error union: every named way this operation can fail ---------------
export type ScheduleError =
  | { kind: 'empty_content' }
  | { kind: 'too_long'; max: number; actual: number }
  | { kind: 'past_date'; scheduledFor: Date }
  | { kind: 'quota_exceeded'; limit: number }
  | { kind: 'account_disconnected'; platform: string }

export type Draft = {
  content: string
  scheduledFor: Date
  accountId: string
}
export type ScheduledPost = Draft & { id: string }

const MAX_LEN = 280
const MONTHLY_QUOTA = 30

// ---- Pretend infrastructure (swap these for real calls) --------------------

// pseudo-code: `SELECT count(*) FROM posts WHERE account = ? AND month = now()`
const scheduledThisMonth: Record<string, number> = {
  acct_ok: 2,
  acct_full: MONTHLY_QUOTA, // already at the limit
}
const getScheduledCountThisMonth = (accountId: string): number =>
  scheduledThisMonth[accountId] ?? 0

// pseudo-code: `SELECT connected, platform FROM accounts WHERE id = ?`
const accounts: Record<string, { connected: boolean; platform: string }> = {
  acct_ok: { connected: true, platform: 'Instagram' },
  acct_full: { connected: true, platform: 'Instagram' },
  acct_offline: { connected: false, platform: 'TikTok' },
}
const getAccount = (
  accountId: string
): { connected: boolean; platform: string } =>
  accounts[accountId] ?? { connected: false, platform: 'unknown' }

// pseudo-code: `INSERT INTO scheduled_posts (...) RETURNING id`
let idCounter = 0
const persist = (d: Draft): ScheduledPost => ({
  ...d,
  id: `post_${++idCounter}`,
})

// ---- The steps: each is small, pure, and honest about how it can fail -------

export const validateContent = (d: Draft): Result<ScheduleError, Draft> => {
  if (d.content.trim() === '') return err({ kind: 'empty_content' })
  if (d.content.length > MAX_LEN)
    return err({ kind: 'too_long', max: MAX_LEN, actual: d.content.length })

  return ok(d)
}

export const validateTiming = (d: Draft): Result<ScheduleError, Draft> =>
  d.scheduledFor.getTime() <= Date.now()
    ? err({ kind: 'past_date', scheduledFor: d.scheduledFor })
    : ok(d)

export const checkQuota = (d: Draft): Result<ScheduleError, Draft> =>
  getScheduledCountThisMonth(d.accountId) >= MONTHLY_QUOTA
    ? err({ kind: 'quota_exceeded', limit: MONTHLY_QUOTA })
    : ok(d)

export const checkAccount = (d: Draft): Result<ScheduleError, Draft> => {
  const account = getAccount(d.accountId)
  return account.connected
    ? ok(d)
    : err({ kind: 'account_disconnected', platform: account.platform })
}

// ---- Composition -----------------------------------------------------------
// Every check shares the shape (Draft) => Result<ScheduleError, Draft>,
// so we can FOLD them with flatMap. The fold short-circuits for free:
// the moment one step returns Err, flatMap passes it straight through
// and the rest are skipped. No nested ifs, no pyramid.
// Then `map(_, persist)` runs only on the success path.
//
// (With Effect or fp-ts you'd write this as a vertical `pipe(draft, ...)` chain;
// the mechanics are identical to this reduce.)
export const schedulePost = (
  draft: Draft
): Result<ScheduleError, ScheduledPost> => {
  const checks = [validateContent, validateTiming, checkQuota, checkAccount]
  const validated = checks.reduce<Result<ScheduleError, Draft>>(
    (acc, check) => flatMap(acc, check),
    ok(draft)
  )

  return map(validated, persist)
}

// ---- The boundary: handle every failure, exhaustively ----------------------
// `error` is a ScheduleError, so the switch must cover all five variants.
// Add a sixth variant to ScheduleError and `assertNever(e)` stops compiling here
// until you add its case — the new failure CANNOT silently become a generic 500 or a blank screen.
export const toUserMessage = (e: ScheduleError): string => {
  switch (e.kind) {
    case 'empty_content':
      return "Your post can't be empty."
    case 'too_long':
      return `Too long by ${e.actual - e.max} characters.`
    case 'past_date':
      return 'Pick a time in the future.'
    case 'quota_exceeded':
      return `You've hit your ${e.limit}-post limit this month.`
    case 'account_disconnected':
      return `Reconnect your ${e.platform} account to continue.`

    default:
      return assertNever(e)
  }
}
