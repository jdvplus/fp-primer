// ============================================================================
// exhaustive.ts — `never` as a compile-time completeness check
// ----------------------------------------------------------------------------
// `never` is the type with NO values (the empty set / bottom type).
//
// Two facts fall out of that and explain everything below:
//   1. NOTHING is assignable TO `never`.
//      (You can't make a value of a type that has no values.)
//   2. `never` is assignable FROM nothing but itself,
//      yet assignable TO every type (vacuously).
//
// Fact #1 is the useful one. After a `switch` handles every variant of a union,
// the variable narrows to `never`. Passing it to a function that expects `never` is fine.
//
// But add a new variant and forget its case, and the variable narrows to
// THAT leftover variant instead — which is no longer assignable to `never`,
// so the call stops compiling and points you at the gap.
// ============================================================================

// The one helper. The runtime throw exists only so the function can honestly claim
// a `: never` return type; in correct code it is never reached.
export function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`)
}

// ---- Example A: a useReducer-style reducer ---------------------------------
// Actions are a discriminated union.
// `default: assertNever(action)` guarantees every action type is handled.
// Add `| { type: "double" }` to CounterAction and this file won't compile
// until you add the case. Try it.
export type CounterAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'set'; value: number }
  | { type: 'reset' }

export function counterReducer(state: number, action: CounterAction): number {
  switch (action.type) {
    case 'increment':
      return state + 1
    case 'decrement':
      return state - 1
    case 'set':
      return action.value // `value` only exists on this variant
    case 'reset':
      return 0

    default:
      return assertNever(action)
  }
}

// ---- Example B: rendering remote data --------------------------------------
// "Make illegal states unrepresentable": you cannot have data AND an error
// at the same time, and `data` only exists on the success variant.
// So unsafe access isn't a discipline you have to remember - it's structurally impossible.
//
// In a real React component each branch would `return <JSX/>`.
// Here we return a string, so the file runs with plain Node.
export type RemoteData<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

export function describeRemote<T>(state: RemoteData<T>): string {
  switch (state.status) {
    case 'idle':
      return '(nothing requested yet)'
    case 'loading':
      return 'Loading…'
    case 'success':
      return `Loaded: ${JSON.stringify(state.data)}` // data: only reachable here
    case 'error':
      return `Error: ${state.message}`

    default:
      return assertNever(state)
  }
}
