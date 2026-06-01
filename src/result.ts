// ============================================================================
// result.ts — Errors as values
// ----------------------------------------------------------------------------
// A `Result<E, A>` is "either a success carrying an A, or a failure carrying an E."
//
// Instead of THROWING (invisible control flow that the type system can't see),
// a function RETURNS its failure.
//
// This puts every way an operation can fail *directly* into its signature,
// where the compiler can enforce it.
// ============================================================================

// A discriminated union: the `_tag` field is the internal field which the compiler uses to narrow.
// `readonly` keeps values immutable (a core FP habit).

export type Result<E, A> =
  | { readonly _tag: 'Ok'; readonly value: A }
  | { readonly _tag: 'Err'; readonly error: E }

// ---- Constructors ----------------------------------------------------------
// Note the `never` channels! `ok` produces a value that CAN'T be an error,
// so its error type is `never`; `err` is the mirror.
//
// Because `never` is the bottom type (assignable to everything),
// `ok("x")` slots cleanly into any `Result<SomeError, string>` without a cast.
//
// This is `never` earning its keep.

export const ok = <A>(value: A): Result<never, A> => ({ _tag: 'Ok', value })
export const err = <E>(error: E): Result<E, never> => ({ _tag: 'Err', error })

// ---- Type guards -----------------------------------------------------------
// These narrow a Result for the compiler.
// After `if (isOk(r))`, TS knows `r.value` exists; in the `else`, it knows `r.error` exists.

export const isOk = <E, A>(
  r: Result<E, A>
): r is { readonly _tag: 'Ok'; readonly value: A } => {
  return r._tag === 'Ok'
}

export const isErr = <E, A>(
  r: Result<E, A>
): r is { readonly _tag: 'Err'; readonly error: E } => {
  return r._tag === 'Err'
}

// ---- Combinators -----------------------------------------------------------

// FUNCTOR: `map` transforms the success value, leaving an Err untouched.
// (Same idea as Array.map / Promise.then — reach inside, transform, rewrap.)
export const map = <E, A, B>(
  r: Result<E, A>,
  fn: (a: A) => B
): Result<E, B> => {
  if (r._tag === 'Ok') return ok(fn(r.value))
  return r
}

// Transform the ERROR channel instead (e.g. translate a low-level error into a domain error).
// Useful for adapting one layer's errors to another's.
export const mapError = <E, A, F>(
  r: Result<E, A>,
  fn: (e: E) => F
): Result<F, A> => {
  if (r._tag === 'Err') return err(fn(r.error))
  return r
}

// MONAD: `flatMap` (a.k.a. chain/bind) sequences a step that ITSELF can fail.
// Without it you'd get nested Result<E, Result<F, B>>; flatMap flattens that.
//
// The killer detail: the return type is `Result<E | F, B>`. As you chain steps,
// the error channel ACCUMULATES the union of everything that can go wrong.
//
// That growing union is exactly what an exhaustive handler (see `exhaustive.ts`)
// then forces you to deal with. The two patterns interlock.
export const flatMap = <E, A, F, B>(
  r: Result<E, A>,
  fn: (a: A) => Result<F, B>
): Result<E | F, B> => {
  if (r._tag === 'Ok') return fn(r.value)
  return r
}

// Escape hatch: get the value, or compute a fallback from the error.
export const getOrElse = <E, A>(r: Result<E, A>, onErr: (e: E) => A): A => {
  if (r._tag === 'Ok') return r.value
  return onErr(r.error)
}

// `match` (a.k.a. fold) collapses a Result into a single value by handling both branches.
// This is the idiomatic, exhaustive way to CONSUME a Result —
// you can't forget a branch because both handlers are required.
export const match = <E, A, B>(
  r: Result<E, A>,
  handlers: { ok: (value: A) => B; err: (error: E) => B }
): B => {
  if (r._tag === 'Ok') return handlers.ok(r.value)
  return handlers.err(r.error)
}
