// ============================================================================
// result.ts — Errors as values
// ----------------------------------------------------------------------------
// A `Result<A, E>` is "either a success carrying an A, or a failure carrying an E."
//
// Instead of THROWING (invisible control flow that the type system can't see),
// a function RETURNS its failure.
//
// This puts every way an operation can fail *directly* into its signature,
// where the compiler can enforce it.
//
// Type-parameter order is `<A, E>` (success first), matching Effect's
// `Effect<A, E, R>` and Rust's `Result<T, E>`. Note this differs from fp-ts'
// `Either<E, A>`, which puts error first.
// ============================================================================

// A discriminated union: the `_tag` field is the internal field which the compiler uses to narrow.
// `readonly` keeps values immutable (a core FP habit).

export type Result<A, E> =
  | { readonly _tag: 'Ok'; readonly value: A }
  | { readonly _tag: 'Err'; readonly error: E }

// ---- Constructors ----------------------------------------------------------
// Note the `never` channels! `ok` produces a value that CAN'T be an error,
// so its error type is `never`; `err` is the mirror.
//
// Because `never` is the bottom type (assignable to everything),
// `ok("x")` slots cleanly into any `Result<string, SomeError>` without a cast.
//
// This is `never` earning its keep.

export const ok = <A>(value: A): Result<A, never> => ({ _tag: 'Ok', value })
export const err = <E>(error: E): Result<never, E> => ({ _tag: 'Err', error })

// ---- Type guards -----------------------------------------------------------
// These narrow a Result for the compiler.
// After `if (isOk(r))`, TS knows `r.value` exists; in the `else`, it knows `r.error` exists.

export const isOk = <A, E>(
  r: Result<A, E>
): r is { readonly _tag: 'Ok'; readonly value: A } => {
  return r._tag === 'Ok'
}

export const isErr = <A, E>(
  r: Result<A, E>
): r is { readonly _tag: 'Err'; readonly error: E } => {
  return r._tag === 'Err'
}

// ---- Combinators -----------------------------------------------------------

// FUNCTOR: `map` transforms the success value, leaving an Err untouched.
// (Same idea as Array.map / Promise.then — reach inside, transform, rewrap.)
export const map = <A, B, E>(
  r: Result<A, E>,
  fn: (a: A) => B
): Result<B, E> => {
  if (r._tag === 'Ok') return ok(fn(r.value))
  return r
}

// Transform the ERROR channel instead (e.g. translate a low-level error into a domain error).
// Useful for adapting one layer's errors to another's.
export const mapError = <A, E, F>(
  r: Result<A, E>,
  fn: (e: E) => F
): Result<A, F> => {
  if (r._tag === 'Err') return err(fn(r.error))
  return r
}

// MONAD: `flatMap` (a.k.a. chain/bind) sequences a step that ITSELF can fail.
// Without it you'd get nested Result<Result<B, F>, E>; flatMap flattens that.
//
// The killer detail: the return type is `Result<B, E | F>`. As you chain steps,
// the error channel ACCUMULATES the union of everything that can go wrong.
//
// That growing union is exactly what an exhaustive handler (see `exhaustive.ts`)
// then forces you to deal with. The two patterns interlock.
export const flatMap = <A, B, E, F>(
  r: Result<A, E>,
  fn: (a: A) => Result<B, F>
): Result<B, E | F> => {
  if (r._tag === 'Ok') return fn(r.value)
  return r
}

// Escape hatch: get the value, or compute a fallback from the error.
export const getOrElse = <A, E>(r: Result<A, E>, onErr: (e: E) => A): A => {
  if (r._tag === 'Ok') return r.value
  return onErr(r.error)
}

// `match` (a.k.a. fold) collapses a Result into a single value by handling both branches.
// This is the idiomatic, exhaustive way to CONSUME a Result —
// you can't forget a branch because both handlers are required.
export const match = <A, B, E>(
  r: Result<A, E>,
  handlers: { ok: (value: A) => B; err: (error: E) => B }
): B => {
  if (r._tag === 'Ok') return handlers.ok(r.value)
  return handlers.err(r.error)
}
