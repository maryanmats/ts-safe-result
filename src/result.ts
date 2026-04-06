export type Result<Value, Error> = Ok<Value, Error> | Err<Value, Error>;

export interface Ok<Value, Error = never> {
  readonly ok: true;
  readonly value: Value;

  /** Transform the success value. Skipped if this is an Err. */
  map<NewValue>(transform: (value: Value) => NewValue): Result<NewValue, Error>;

  /** Transform the error value. Skipped if this is an Ok. */
  mapErr<NewError>(
    transform: (error: Error) => NewError,
  ): Result<Value, NewError>;

  /**
   * Chain a dependent operation that itself returns a Result.
   * Useful when the next step can also fail.
   */
  flatMap<NewValue, NewError>(
    transform: (value: Value) => Result<NewValue, NewError>,
  ): Result<NewValue, Error | NewError>;

  /**
   * Perform a side effect with the success value without transforming it.
   * Useful for logging or analytics within a chain.
   */
  tap(sideEffect: (value: Value) => void): Result<Value, Error>;

  /**
   * Perform a side effect with the error value without transforming it.
   * Useful for error reporting within a chain.
   */
  tapErr(sideEffect: (error: Error) => void): Result<Value, Error>;

  /**
   * Exhaustive pattern matching — handle both Ok and Err cases.
   * TypeScript ensures you cover both branches.
   */
  match<Output>(handlers: {
    ok: (value: Value) => Output;
    err: (error: Error) => Output;
  }): Output;

  /** Extract the value. Throws if this is an Err. */
  unwrap(): Value;

  /** Extract the value, or return the fallback if this is an Err. */
  unwrapOr(fallback: Value): Value;

  /** Extract the value, or compute a fallback from the error. */
  unwrapOrElse(handleError: (error: Error) => Value): Value;

  /** Type guard — returns true if this is an Ok. */
  isOk(): this is Ok<Value, Error>;

  /** Type guard — returns true if this is an Err. */
  isErr(): this is Err<Value, Error>;
}

export interface Err<Value = never, Error = unknown> {
  readonly ok: false;
  readonly error: Error;

  /** Transform the success value. Skipped if this is an Err. */
  map<NewValue>(transform: (value: Value) => NewValue): Result<NewValue, Error>;

  /** Transform the error value. Skipped if this is an Ok. */
  mapErr<NewError>(
    transform: (error: Error) => NewError,
  ): Result<Value, NewError>;

  /**
   * Chain a dependent operation that itself returns a Result.
   * Useful when the next step can also fail.
   */
  flatMap<NewValue, NewError>(
    transform: (value: Value) => Result<NewValue, NewError>,
  ): Result<NewValue, Error | NewError>;

  /**
   * Perform a side effect with the success value without transforming it.
   * Useful for logging or analytics within a chain.
   */
  tap(sideEffect: (value: Value) => void): Result<Value, Error>;

  /**
   * Perform a side effect with the error value without transforming it.
   * Useful for error reporting within a chain.
   */
  tapErr(sideEffect: (error: Error) => void): Result<Value, Error>;

  /**
   * Exhaustive pattern matching — handle both Ok and Err cases.
   * TypeScript ensures you cover both branches.
   */
  match<Output>(handlers: {
    ok: (value: Value) => Output;
    err: (error: Error) => Output;
  }): Output;

  /** Extract the value. Always throws for Err. */
  unwrap(): never;

  /** Extract the value, or return the fallback if this is an Err. */
  unwrapOr<Fallback>(fallback: Fallback): Fallback;

  /** Extract the value, or compute a fallback from the error. */
  unwrapOrElse<Fallback>(handleError: (error: Error) => Fallback): Fallback;

  /** Type guard — returns true if this is an Ok. */
  isOk(): this is Ok<Value, Error>;

  /** Type guard — returns true if this is an Err. */
  isErr(): this is Err<Value, Error>;
}

class OkImpl<Value, Error = never> implements Ok<Value, Error> {
  readonly ok = true as const;
  constructor(readonly value: Value) {}

  map<NewValue>(
    transform: (value: Value) => NewValue,
  ): Result<NewValue, Error> {
    return new OkImpl(transform(this.value));
  }

  mapErr<NewError>(
    _transform: (error: Error) => NewError,
  ): Result<Value, NewError> {
    return this as unknown as Result<Value, NewError>;
  }

  flatMap<NewValue, NewError>(
    transform: (value: Value) => Result<NewValue, NewError>,
  ): Result<NewValue, Error | NewError> {
    return transform(this.value);
  }

  tap(sideEffect: (value: Value) => void): Result<Value, Error> {
    sideEffect(this.value);
    return this;
  }

  tapErr(_sideEffect: (error: Error) => void): Result<Value, Error> {
    return this;
  }

  match<Output>(handlers: {
    ok: (value: Value) => Output;
    err: (error: Error) => Output;
  }): Output {
    return handlers.ok(this.value);
  }

  unwrap(): Value {
    return this.value;
  }

  unwrapOr(_fallback: Value): Value {
    return this.value;
  }

  unwrapOrElse(_handleError: (error: Error) => Value): Value {
    return this.value;
  }

  isOk(): this is Ok<Value, Error> {
    return true;
  }

  isErr(): this is Err<Value, Error> {
    return false;
  }
}

class ErrImpl<Value = never, Error = unknown> implements Err<Value, Error> {
  readonly ok = false as const;
  constructor(readonly error: Error) {}

  map<NewValue>(
    _transform: (value: Value) => NewValue,
  ): Result<NewValue, Error> {
    return this as unknown as Result<NewValue, Error>;
  }

  mapErr<NewError>(
    transform: (error: Error) => NewError,
  ): Result<Value, NewError> {
    return new ErrImpl(transform(this.error));
  }

  flatMap<NewValue, NewError>(
    _transform: (value: Value) => Result<NewValue, NewError>,
  ): Result<NewValue, Error | NewError> {
    return this as unknown as Result<NewValue, Error | NewError>;
  }

  tap(_sideEffect: (value: Value) => void): Result<Value, Error> {
    return this;
  }

  tapErr(sideEffect: (error: Error) => void): Result<Value, Error> {
    sideEffect(this.error);
    return this;
  }

  match<Output>(handlers: {
    ok: (value: Value) => Output;
    err: (error: Error) => Output;
  }): Output {
    return handlers.err(this.error);
  }

  unwrap(): never {
    throw this.error instanceof globalThis.Error
      ? this.error
      : new globalThis.Error(String(this.error));
  }

  unwrapOr<Fallback>(fallback: Fallback): Fallback {
    return fallback;
  }

  unwrapOrElse<Fallback>(handleError: (error: Error) => Fallback): Fallback {
    return handleError(this.error);
  }

  isOk(): this is Ok<Value, Error> {
    return false;
  }

  isErr(): this is Err<Value, Error> {
    return true;
  }
}

/** Create a successful Result containing a value. */
export function ok<Value>(value: Value): Ok<Value, never> {
  return new OkImpl(value);
}

/** Create a failed Result containing an error. */
export function err<Error>(error: Error): Err<never, Error> {
  return new ErrImpl(error);
}
