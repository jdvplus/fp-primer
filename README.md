# fp-primer

A small, standalone TypeScript playground for **functional error handling** —
`Result`, `Option`, and the `never` type. Everything is annotated to teach, not
to be lean production code. Nothing here touches a real backend; it's a sandbox
to read, run, and poke at.

## Installation + running

```bash
npm install
npm run demo        # runs src/demo.ts — prints every success/failure path
npm run typecheck   # tsc --noEmit — proves the types hold under strict mode
```

(Requires Node 24+, which runs TS directly via native type stripping — no build step, no `tsx`.)

## The arc (read the files in this order)

1. **`src/result.ts`**: the core.

- `Result<E, A>` = "succeeded with A, or failed
  with E."
- Constructors (`ok`/`err`), the functor (`map`), the monad
  (`flatMap`), plus `match`/`getOrElse`.
- Watch how `flatMap` accumulates the
  error type as `E | F` — that growing union is the whole point.

2. **`src/option.ts`**: the sibling ADT (Abstract Data Type).

- `Option<A>` = "present, or absent."
- The typed replacement for `null`/`undefined`. Same shape as `Result`, one
  fewer type parameter.
- (Bonus reading; not used by the demo.)

3. **`src/exhaustive.ts`**: the `never` type as a completeness check.

- `assertNever` plus two examples (a reducer and a `RemoteData` renderer).
- The payoff: add a variant to a union, and the compiler refuses to build
  until you handle it everywhere.
  - Try it — add `| { type: "double" }` to
    `CounterAction` and run `npm run typecheck`.

4. **`src/schedule-post.ts`**: the capstone.

- A realistic "schedule a post"
  pipeline that composes small `Result`-returning checks, short-circuits on
  the first failure, and handles every failure exhaustively at the boundary.
  The three fake infra functions are the only impure parts — the rest is pure.

5. **`src/demo.ts`**: runnable proof.

- Exercises the happy path and all six
  failure modes, with `assert` calls that double as tests.

## The core idea

Push failure detection from **runtime** (or _never_) to **compile time**, and
make the type the **single source of truth**. When the set of cases changes,
the compiler hands you an exact to-do list of every place to update, instead
of leaving you to grep and pray.

## Where this goes next

When `Result` chains start feeling verbose, that's the signal to reach for
[**Effect**](https://effect.website) or [**fp-ts**](https://gcanti.github.io/fp-ts/):
they give you a properly typed `pipe`, async-aware versions of these
combinators, and dependency injection — the same ideas, batteries included.
