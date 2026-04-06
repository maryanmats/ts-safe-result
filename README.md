# ts-safe-result

A tiny, type-safe `Result<Value, Error>` type for TypeScript. Handle errors as values, not exceptions.

[![npm](https://img.shields.io/npm/v/ts-safe-result)](https://www.npmjs.com/package/ts-safe-result)
[![bundle size](https://img.shields.io/bundlephobia/minzip/ts-safe-result)](https://bundlephobia.com/package/ts-safe-result)
[![license](https://img.shields.io/npm/l/ts-safe-result)](./LICENSE)

## Why?

TypeScript function signatures lie. `async function getUser(id: string): Promise<User>` tells you the happy path — it says nothing about what goes wrong.

Every modern language has solved this: Rust has `Result`, Go has error values, Swift has typed throws. JavaScript still has `try/catch` with `unknown` errors.

`ts-safe-result` brings typed errors to TypeScript — **zero dependencies, under 1KB, fully tree-shakable**.

> **Read the full philosophy:** [Stop Writing try/catch — Your TypeScript Errors Deserve Types](https://maryanmats.dev/blog/try-catch-typed-errors)

## Install

```bash
npm install ts-safe-result
# or
pnpm add ts-safe-result
# or
yarn add ts-safe-result
# or
bun add ts-safe-result
```

## Quick Start

```typescript
import { ok, err, tryCatch, tryAsync } from 'ts-safe-result';
import type { Result } from 'ts-safe-result';

// Create typed results
const success = ok(42);              // Ok<number, never>
const failure = err('Not found');    // Err<never, string>

// Wrap functions that may throw
const parsed = tryCatch(() => JSON.parse(rawInput));
// Result<unknown, Error>

// Wrap async operations
const userData = await tryAsync(() =>
  fetch('/api/user').then(response => response.json())
);
// Result<unknown, Error>
```

## API

### Constructors

#### `ok(value)` — Create a successful result

```typescript
const user = ok({ name: 'Maryan', role: 'admin' });
// Ok<{ name: string; role: string }, never>
```

#### `err(error)` — Create a failed result

```typescript
const failure = err({ code: 'NOT_FOUND', message: 'User does not exist' });
// Err<never, { code: string; message: string }>
```

---

### Methods

#### `.map(transform)` — Transform the success value

```typescript
ok(2).map(count => count * 3);
// Ok(6)

err('not found').map(count => count * 3);
// Err('not found') — transform is skipped
```

#### `.mapErr(transform)` — Transform the error value

```typescript
err('timeout').mapErr(message => new Error(message));
// Err(Error('timeout'))

ok(42).mapErr(message => new Error(message));
// Ok(42) — transform is skipped
```

#### `.flatMap(transform)` — Chain dependent results

Use when the transform itself returns a `Result`:

```typescript
const parseAge = (input: string): Result<number, string> => {
  const age = parseInt(input, 10);
  return isNaN(age) ? err('Invalid number') : ok(age);
};

ok('25').flatMap(parseAge);   // Ok(25)
ok('abc').flatMap(parseAge);  // Err('Invalid number')
err('missing').flatMap(parseAge); // Err('missing') — skipped
```

#### `.tap(sideEffect)` — Inspect the value without transforming it

Useful for logging or debugging within a chain:

```typescript
const user = await tryAsync(() => fetchUser(id))
  .tap(user => console.log('Fetched:', user.name))
  .map(user => user.email);
// Side effect runs, but the Result stays unchanged
```

#### `.tapErr(sideEffect)` — Inspect the error without transforming it

Useful for error reporting within a chain:

```typescript
const config = tryCatch(() => JSON.parse(rawConfig))
  .tapErr(error => Sentry.captureException(error))
  .unwrapOr(defaultConfig);
// Error gets reported, but the chain continues
```

#### `.match({ ok, err })` — Exhaustive pattern matching

Handle both cases explicitly — TypeScript ensures you cover both:

```typescript
const message = result.match({
  ok:  user  => `Welcome, ${user.name}`,
  err: error => `Login failed: ${error.message}`,
});
```

#### `.unwrap()` — Extract value or throw

```typescript
ok(42).unwrap();          // 42
err('broken').unwrap();   // throws Error('broken')
```

#### `.unwrapOr(fallback)` — Extract value or use a fallback

```typescript
ok(42).unwrapOr(0);          // 42
err('broken').unwrapOr(0);   // 0
```

#### `.unwrapOrElse(handleError)` — Extract value or compute a fallback

```typescript
err('broken').unwrapOrElse(error => `recovered from: ${error}`);
// 'recovered from: broken'
```

#### `.isOk()` / `.isErr()` — Type guards for narrowing

```typescript
const result: Result<User, AppError> = await getUser('123');

if (result.isOk()) {
  console.log(result.value.name);  // ✅ TypeScript knows .value exists
}

if (result.isErr()) {
  console.log(result.error.code);  // ✅ TypeScript knows .error exists
}
```

---

### Utilities

#### `tryCatch(execute)` — Wrap a sync function that may throw

```typescript
const config = tryCatch(() => JSON.parse(rawConfigString));
// Result<unknown, Error>
```

#### `tryAsync(execute)` — Wrap an async function that may throw

```typescript
const post = await tryAsync(async () => {
  const response = await fetch('/api/posts/1');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
});
// Result<unknown, Error>
```

#### `fromPromise(promise)` — Wrap a promise directly

```typescript
const response = await fromPromise(fetch('/api/health'));
// Result<Response, Error>
```

#### `fromNullable(value, error)` — Convert nullable to a Result

```typescript
const apiKey = fromNullable(
  process.env.API_KEY,
  'API_KEY environment variable is not set',
);
// Result<string, string>
```

#### `collect(results)` — Combine an array of Results

Succeeds only if every Result is Ok. Returns the first error otherwise:

```typescript
const users = collect([ok(alice), ok(bob), ok(charlie)]);
// Ok([alice, bob, charlie])

const users = collect([ok(alice), err('Bob not found'), ok(charlie)]);
// Err('Bob not found')
```

---

## Real-World Patterns

### Type-safe API client

Define your error types as a discriminated union, then use `.match()` to handle every case:

```typescript
type ApiError =
  | { type: 'network'; message: string }
  | { type: 'not_found' }
  | { type: 'validation'; fields: string[] };

async function fetchUser(userId: string): Promise<Result<User, ApiError>> {
  const response = await tryAsync(() => fetch(`/api/users/${userId}`));

  return response
    .mapErr((networkError): ApiError => ({
      type: 'network',
      message: networkError.message,
    }))
    .flatMap(res => {
      if (res.status === 404) return err<ApiError>({ type: 'not_found' });
      if (!res.ok) return err<ApiError>({ type: 'network', message: `HTTP ${res.status}` });
      return ok(res);
    })
    .map(res => res.json() as Promise<User>);
}

// Every error is visible in the type signature and handled explicitly
const userResult = await fetchUser('123');

userResult.match({
  ok: user => renderProfile(user),
  err: error => {
    switch (error.type) {
      case 'not_found':   return render404();
      case 'network':     return renderNetworkError(error.message);
      case 'validation':  return renderFieldErrors(error.fields);
    }
  },
});
```

### Chaining transformations

Chain multiple operations — the pipeline short-circuits on the first error:

```typescript
const userEmail = tryCatch(() => JSON.parse(rawPayload))
  .map(payload => payload.users)
  .flatMap(users =>
    fromNullable(
      users.find(user => user.id === targetId),
      'User not found in payload',
    ),
  )
  .map(user => user.email)
  .unwrapOr('unknown@example.com');
```

### With Zod validation

```typescript
function safeValidate<Schema>(
  schema: z.ZodSchema<Schema>,
  data: unknown,
): Result<Schema, z.ZodError> {
  const parsed = schema.safeParse(data);
  return parsed.success ? ok(parsed.data) : err(parsed.error);
}

const validatedUser = safeValidate(UserSchema, requestBody);

validatedUser.match({
  ok:  user  => saveToDatabase(user),
  err: zodError => respondWithErrors(zodError.flatten()),
});
```

---

## Comparison

| Feature | ts-safe-result | neverthrow | ts-results | fp-ts |
|---|---|---|---|---|
| Bundle size | < 1KB | ~5KB | ~3KB | ~50KB |
| Tree-shakable | Yes | Partial | No | Yes |
| `.match()` | Yes | Yes | No | No |
| Async utilities | Functions | Class-based | No | TaskEither |
| Learning curve | Minimal | Low | Low | High |
| Dependencies | 0 | 0 | 0 | 0 |

## Philosophy

This library follows three principles:

1. **Errors are values, not exceptions.** If a function can fail, the failure should be part of the return type.
2. **Impossible states should be impossible.** A `Result` is either `Ok` or `Err` — never both, never neither.
3. **Simple beats clever.** No monads, no functors, no category theory. Just `ok`, `err`, and methods you already know.

## License

MIT
