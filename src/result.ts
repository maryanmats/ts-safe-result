export type Result<Value, Error> = Ok<Value, Error> | Err<Value, Error>;

export interface Ok<Value, Error = never> {
  readonly ok: true;
  readonly value: Value;
  map<NewValue>(transform: (value: Value) => NewValue): Result<NewValue, Error>;
  mapErr<NewError>(
    transform: (error: Error) => NewError,
  ): Result<Value, NewError>;
  flatMap<NewValue, NewError>(
    transform: (value: Value) => Result<NewValue, NewError>,
  ): Result<NewValue, Error | NewError>;
  match<Output>(handlers: {
    ok: (value: Value) => Output;
    err: (error: Error) => Output;
  }): Output;
  unwrap(): Value;
  unwrapOr(fallback: Value): Value;
  unwrapOrElse(handleError: (error: Error) => Value): Value;
  isOk(): this is Ok<Value, Error>;
  isErr(): this is Err<Value, Error>;
}

export interface Err<Value = never, Error = unknown> {
  readonly ok: false;
  readonly error: Error;
  map<NewValue>(transform: (value: Value) => NewValue): Result<NewValue, Error>;
  mapErr<NewError>(
    transform: (error: Error) => NewError,
  ): Result<Value, NewError>;
  flatMap<NewValue, NewError>(
    transform: (value: Value) => Result<NewValue, NewError>,
  ): Result<NewValue, Error | NewError>;
  match<Output>(handlers: {
    ok: (value: Value) => Output;
    err: (error: Error) => Output;
  }): Output;
  unwrap(): never;
  unwrapOr<Fallback>(fallback: Fallback): Fallback;
  unwrapOrElse<Fallback>(handleError: (error: Error) => Fallback): Fallback;
  isOk(): this is Ok<Value, Error>;
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

export function ok<Value>(value: Value): Ok<Value, never> {
  return new OkImpl(value);
}

export function err<Error>(error: Error): Err<never, Error> {
  return new ErrImpl(error);
}
