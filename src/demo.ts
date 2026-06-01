// ============================================================================
// demo.ts - run with `npm run demo`
// ----------------------------------------------------------------------------
// Exercises the happy path plus every failure variant of schedulePost,
// then a quick look at the `never` examples.
//
// The `assert` calls double as tests: if the pipeline ever misbehaves,
// the script throws instead of printing the final success line.
// ============================================================================

import assert from 'node:assert'
import { schedulePost, toUserMessage, type Draft } from './schedule-post.ts'
import { isOk } from './result.ts'
import { counterReducer, describeRemote } from './exhaustive.ts'

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

function show(label: string, draft: Draft) {
  const result = schedulePost(draft)

  if (isOk(result)) {
    console.log(`  ✅ ${label}: scheduled as ${result.value.id}`)
  } else {
    console.log(
      `  ❌ ${label}: ${toUserMessage(result.error)}  [${result.error.kind}]`
    )
  }

  return result
}

console.log('— schedulePost scenarios —')

const happy = show('valid post', {
  content: 'Launch day! 🎉',
  scheduledFor: tomorrow,
  accountId: 'acct_ok',
})
assert(isOk(happy))

const empty = show('empty content', {
  content: '   ',
  scheduledFor: tomorrow,
  accountId: 'acct_ok',
})
assert(!isOk(empty) && empty.error.kind === 'empty_content')

const long = show('too long', {
  content: 'x'.repeat(300),
  scheduledFor: tomorrow,
  accountId: 'acct_ok',
})
assert(!isOk(long) && long.error.kind === 'too_long')

const late = show('past date', {
  content: 'oops, time travel',
  scheduledFor: yesterday,
  accountId: 'acct_ok',
})
assert(!isOk(late) && late.error.kind === 'past_date')

const full = show('quota exceeded', {
  content: 'one more post',
  scheduledFor: tomorrow,
  accountId: 'acct_full',
})
assert(!isOk(full) && full.error.kind === 'quota_exceeded')

const offline = show('disconnected account', {
  content: 'hello world',
  scheduledFor: tomorrow,
  accountId: 'acct_offline',
})
assert(!isOk(offline) && offline.error.kind === 'account_disconnected')

const missing = show('unknown account', {
  content: 'hello world',
  scheduledFor: tomorrow,
  accountId: 'acct_does_not_exist',
})
assert(!isOk(missing) && missing.error.kind === 'account_not_found')

console.log('\n— never / exhaustiveness —')
console.log(
  '  counterReducer(0, increment) =>',
  counterReducer(0, { type: 'increment' })
)
console.log(
  '  describeRemote(success)      =>',
  describeRemote({ status: 'success', data: { id: 1 } })
)
console.log(
  '  describeRemote(loading)      =>',
  describeRemote({ status: 'loading' })
)

console.log('\nAll assertions passed ✅')
