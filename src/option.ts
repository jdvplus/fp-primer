// ============================================================================
// option.ts — The absence of a value, made explicit
// ----------------------------------------------------------------------------
// `Option<A>` is "either Some value, or None."
//
// It's the typed replacement for `null` / `undefined`:
// instead of a value that MIGHT secretly be null, you have a container
// that the compiler forces you to open before use.
//
// It's the sibling of Result<E, A>. Result says "succeeded OR failed with a reason";
// Option says "present OR absent (no reason needed)."
// Same functor/ monad shape, fewer type parameters.
//
// Tip: import this namespaced — `import * as Option from "./option"` —
// so you write Option.map, Option.some, etc.
// (This is how fp-ts / Effect read.)
// ============================================================================

export type Option<A> =
  | { readonly _tag: 'Some'; readonly value: A }
  | { readonly _tag: 'None' }

export const some = <A>(value: A): Option<A> => ({ _tag: 'Some', value })

// `none` has type Option<never>, so it fits any Option<A>.
// (Same bottom-type trick as `err`/`ok`.)
export const none: Option<never> = { _tag: 'None' }

// The bridge from the nullable world (APIs, JSON, the DOM) into Option-land.
export const fromNullable = <A>(
  a: A | null | undefined
): Option<NonNullable<A>> => {
  if (a == null) return none
  return some(a as NonNullable<A>)
}

// FUNCTOR
export const map = <A, B>(o: Option<A>, fn: (a: A) => B): Option<B> => {
  if (o._tag === 'Some') return some(fn(o.value))
  return none
}

// MONAD — chain a step that might also produce nothing.
export const flatMap = <A, B>(
  o: Option<A>,
  fn: (a: A) => Option<B>
): Option<B> => {
  if (o._tag === 'Some') return fn(o.value)
  return none
}

// Consume: get the value or a fallback.
export const getOrElse = <A>(o: Option<A>, fallback: () => A): A => {
  if (o._tag === 'Some') return o.value
  return fallback()
}

// Exhaustive consumption, like Result.match.
export const match = <A, B>(
  o: Option<A>,
  handlers: { some: (value: A) => B; none: () => B }
): B => {
  if (o._tag === 'Some') return handlers.some(o.value)
  return handlers.none()
}
