import type { Result } from "./result.js";
import { ok, err } from "./result.js";

/**
 * Wraps a synchronous function that may throw into a Result.
 *
 * @example
 * const parsed = tryCatch(() => JSON.parse(rawInput));
 * // Result<unknown, Error>
 */
export function tryCatch<Value>(execute: () => Value): Result<Value, Error> {
  try {
    return ok(execute());
  } catch (thrown) {
    return err(thrown instanceof Error ? thrown : new Error(String(thrown)));
  }
}

/**
 * Wraps an async function that may throw into a Result.
 *
 * @example
 * const response = await tryAsync(() => fetch('/api').then(res => res.json()));
 * // Result<unknown, Error>
 */
export async function tryAsync<Value>(
  execute: () => Promise<Value>,
): Promise<Result<Value, Error>> {
  try {
    return ok(await execute());
  } catch (thrown) {
    return err(thrown instanceof Error ? thrown : new Error(String(thrown)));
  }
}

/**
 * Wraps a Promise into a Result. Unlike tryAsync, takes a promise directly.
 *
 * @example
 * const response = await fromPromise(fetch('/api'));
 * // Result<Response, Error>
 */
export async function fromPromise<Value>(
  promise: Promise<Value>,
): Promise<Result<Value, Error>> {
  try {
    return ok(await promise);
  } catch (thrown) {
    return err(thrown instanceof Error ? thrown : new Error(String(thrown)));
  }
}

/**
 * Converts a nullable value to a Result.
 *
 * @example
 * const config = fromNullable(map.get('apiKey'), 'API key not found');
 * // Result<string, string>
 */
export function fromNullable<Value, ErrorType>(
  value: Value | null | undefined,
  error: ErrorType,
): Result<Value, ErrorType> {
  return value != null ? ok(value) : err(error);
}

/**
 * Collects an array of Results into a Result of an array.
 * Returns the first error encountered, or Ok with all values.
 *
 * @example
 * const users = collect([ok(alice), ok(bob), ok(charlie)]);
 * // Ok([alice, bob, charlie])
 *
 * const users = collect([ok(alice), err('not found'), ok(charlie)]);
 * // Err('not found')
 */
export function collect<Value, ErrorType>(
  results: Result<Value, ErrorType>[],
): Result<Value[], ErrorType> {
  const values: Value[] = [];

  for (const result of results) {
    if (!result.ok) return result as unknown as Result<Value[], ErrorType>;
    values.push(result.value);
  }

  return ok(values);
}
