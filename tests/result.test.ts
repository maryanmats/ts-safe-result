import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  tryCatch,
  tryAsync,
  fromPromise,
  fromNullable,
  collect,
} from "../src/index.js";

describe("ok", () => {
  it("creates an Ok result", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(42);
  });

  it("isOk returns true", () => {
    expect(ok(1).isOk()).toBe(true);
    expect(ok(1).isErr()).toBe(false);
  });
});

describe("err", () => {
  it("creates an Err result", () => {
    const result = err("fail");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("fail");
  });

  it("isErr returns true", () => {
    expect(err("x").isErr()).toBe(true);
    expect(err("x").isOk()).toBe(false);
  });
});

describe("map", () => {
  it("transforms Ok value", () => {
    const result = ok(2).map((n) => n * 3);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(6);
  });

  it("skips Err", () => {
    const result = err<string>("fail").map(() => 42);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("fail");
  });
});

describe("mapErr", () => {
  it("transforms Err error", () => {
    const result = err("fail").mapErr((e) => `Error: ${e}`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Error: fail");
  });

  it("skips Ok", () => {
    const result = ok(42).mapErr(() => "new error");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
  });
});

describe("flatMap", () => {
  it("chains Ok results", () => {
    const result = ok(10).flatMap((n) => (n > 0 ? ok(n * 2) : err("negative")));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(20);
  });

  it("chains to Err", () => {
    const result = ok(-1).flatMap((n) => (n > 0 ? ok(n) : err("negative")));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("negative");
  });

  it("skips on Err", () => {
    const result = err<string>("initial").flatMap(() => ok(42));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("initial");
  });
});

describe("match", () => {
  it("calls ok handler for Ok", () => {
    const result = ok(42).match({
      ok: (v) => `value: ${v}`,
      err: (e) => `error: ${e}`,
    });
    expect(result).toBe("value: 42");
  });

  it("calls err handler for Err", () => {
    const result = err("fail").match({
      ok: (v) => `value: ${v}`,
      err: (e) => `error: ${e}`,
    });
    expect(result).toBe("error: fail");
  });
});

describe("tap", () => {
  it("calls side effect for Ok", () => {
    let captured = 0;
    const result = ok(42).tap((value) => {
      captured = value;
    });
    expect(captured).toBe(42);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
  });

  it("skips side effect for Err", () => {
    let called = false;
    err("fail").tap(() => {
      called = true;
    });
    expect(called).toBe(false);
  });

  it("returns the same Result for chaining", () => {
    const result = ok(10)
      .tap(() => {})
      .map((value) => value * 2);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(20);
  });
});

describe("tapErr", () => {
  it("calls side effect for Err", () => {
    let captured = "";
    const result = err("something broke").tapErr((error) => {
      captured = error;
    });
    expect(captured).toBe("something broke");
    expect(result.ok).toBe(false);
  });

  it("skips side effect for Ok", () => {
    let called = false;
    ok(42).tapErr(() => {
      called = true;
    });
    expect(called).toBe(false);
  });

  it("returns the same Result for chaining", () => {
    const result = err("fail")
      .tapErr(() => {})
      .mapErr((error) => `wrapped: ${error}`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("wrapped: fail");
  });
});

describe("unwrap", () => {
  it("returns value for Ok", () => {
    expect(ok(42).unwrap()).toBe(42);
  });

  it("throws for Err with Error", () => {
    expect(() => err(new Error("boom")).unwrap()).toThrow("boom");
  });

  it("throws for Err with string", () => {
    expect(() => err("fail").unwrap()).toThrow("fail");
  });
});

describe("unwrapOr", () => {
  it("returns value for Ok", () => {
    expect(ok(42).unwrapOr(0)).toBe(42);
  });

  it("returns default for Err", () => {
    expect(err("fail").unwrapOr(0)).toBe(0);
  });
});

describe("unwrapOrElse", () => {
  it("returns value for Ok", () => {
    expect(ok(42).unwrapOrElse(() => 0)).toBe(42);
  });

  it("computes default for Err", () => {
    expect(err("fail").unwrapOrElse((e) => `recovered: ${e}`)).toBe(
      "recovered: fail",
    );
  });
});

describe("tryCatch", () => {
  it("wraps successful function", () => {
    const result = tryCatch(() => JSON.parse('{"a":1}'));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ a: 1 });
  });

  it("wraps throwing function", () => {
    const result = tryCatch(() => JSON.parse("invalid"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(Error);
  });

  it("wraps non-Error throws", () => {
    const result = tryCatch(() => {
      throw "string error";
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe("string error");
    }
  });
});

describe("tryAsync", () => {
  it("wraps successful async function", async () => {
    const result = await tryAsync(() => Promise.resolve(42));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
  });

  it("wraps rejected async function", async () => {
    const result = await tryAsync(() =>
      Promise.reject(new Error("async fail")),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe("async fail");
  });
});

describe("fromPromise", () => {
  it("wraps resolved promise", async () => {
    const result = await fromPromise(Promise.resolve("hello"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("hello");
  });

  it("wraps rejected promise", async () => {
    const result = await fromPromise(Promise.reject(new Error("rejected")));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe("rejected");
  });
});

describe("fromNullable", () => {
  it("returns Ok for non-null value", () => {
    const result = fromNullable("hello", "was null");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("hello");
  });

  it("returns Err for null", () => {
    const result = fromNullable(null, "was null");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("was null");
  });

  it("returns Err for undefined", () => {
    const result = fromNullable(undefined, "was undefined");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("was undefined");
  });

  it("returns Ok for falsy non-null values", () => {
    expect(fromNullable(0, "err").ok).toBe(true);
    expect(fromNullable("", "err").ok).toBe(true);
    expect(fromNullable(false, "err").ok).toBe(true);
  });
});

describe("collect", () => {
  it("collects all Ok values", () => {
    const result = collect([ok(1), ok(2), ok(3)]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([1, 2, 3]);
  });

  it("returns first Err", () => {
    const result = collect([ok(1), err("fail"), ok(3)]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("fail");
  });

  it("handles empty array", () => {
    const result = collect([]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });
});

describe("type narrowing", () => {
  it("narrows with ok property", () => {
    const result = ok(42) as ReturnType<typeof ok<number>>;
    if (result.ok) {
      const value: number = result.value;
      expect(value).toBe(42);
    }
  });

  it("narrows with isOk/isErr", () => {
    const result = ok(42) as ReturnType<typeof ok<number>>;
    if (result.isOk()) {
      const value: number = result.value;
      expect(value).toBe(42);
    }
  });
});

describe("chaining", () => {
  it("chains multiple operations", () => {
    const result = ok("42")
      .map((s) => parseInt(s, 10))
      .flatMap((n) => (isNaN(n) ? err("NaN" as const) : ok(n)))
      .map((n) => n * 2)
      .match({
        ok: (v) => `result: ${v}`,
        err: (e) => `error: ${e}`,
      });

    expect(result).toBe("result: 84");
  });

  it("short-circuits on error", () => {
    const result = ok("hello")
      .map((s) => parseInt(s, 10))
      .flatMap((n) => (isNaN(n) ? err("NaN" as const) : ok(n)))
      .map((n) => n * 2)
      .match({
        ok: (v) => `result: ${v}`,
        err: (e) => `error: ${e}`,
      });

    expect(result).toBe("error: NaN");
  });
});
