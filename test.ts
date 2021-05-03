import {
  assertEquals,
  assertThrows,
  assertThrowsAsync,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";
import { pLimit } from "./mod.ts";

export const delay = (timeout: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });

Deno.test("concurrency: 1", async () => {
  const limit = pLimit(1);

  const input = [1, 2, 3, 4, 5, 6];

  const tasks = input.map((i) => limit(() => Promise.resolve(i)));

  const result = await Promise.all(tasks);

  assertEquals(result, input);
});

Deno.test("concurrency: 4", async () => {
  const limit = pLimit(4);

  const input = [1, 2, 3, 4, 5, 6];

  const tasks = input.map((i) => limit(() => Promise.resolve(i)));

  const result = await Promise.all(tasks);

  assertEquals(result, input);
});

Deno.test("non-promise returning function", async () => {
  const limit = pLimit(4);

  const input = [1, 2, 3, 4, 5, 6];

  const tasks = input.map((i) => limit(() => i));

  const result = await Promise.all(tasks);

  assertEquals(result, input);
});

Deno.test("mixed returning function", async () => {
  const limit = pLimit(4);

  const input = [1, 2, 3, 4, 5, 6];

  const tasks = input.map((i) =>
    limit(() => {
      switch (i % 3) {
        case 0: {
          // Promise
          return Promise.resolve(i);
        }

        case 1: {
          // Raw value
          return i;
        }

        default: {
          // PromiseLike
          return {
            then: (resolve: (value: unknown) => number) => {
              resolve(i);
            },
          };
        }
      }
    })
  );

  const result = await Promise.all(tasks);

  assertEquals(result, input);
});

Deno.test("continues after sync throw", async () => {
  const limit = pLimit(1);
  let ran = false;

  const promises = [
    limit(() => {
      throw new Error("err");
    }),
    limit(() => {
      ran = true;
    }),
  ];

  await Promise.all(promises).catch(() => {});

  assertEquals(ran, true);
});

Deno.test("accepts additional arguments", async () => {
  const limit = pLimit(1);
  const symbol = Symbol("test");

  await limit((a) => assertEquals(a, symbol), symbol);
});

Deno.test("does not ignore errors", async () => {
  const limit = pLimit(1);
  const error = new Error("🦄");

  const promises = [
    limit(async () => {
      await delay(30);
    }),
    limit(async () => {
      await delay(80);
      throw error;
    }),
    limit(async () => {
      await delay(50);
    }),
  ];

  await assertThrowsAsync(
    async () => {
      await Promise.allSettled(promises);
      return Promise.all(promises);
    },
    Error,
    error.message,
  );
});

Deno.test("activeCount and pendingCount properties", async () => {
  const limit = pLimit(5);
  assertEquals(limit.activeCount, 0);
  assertEquals(limit.pendingCount, 0);

  const runningPromise1 = limit(() => delay(100));
  assertEquals(limit.activeCount, 0);
  assertEquals(limit.pendingCount, 1);

  await Promise.resolve();
  assertEquals(limit.activeCount, 1);
  assertEquals(limit.pendingCount, 0);

  await runningPromise1;
  assertEquals(limit.activeCount, 0);
  assertEquals(limit.pendingCount, 0);

  const immediatePromises = Array.from(
    { length: 5 },
    () => limit(() => delay(100)),
  );
  const delayedPromises = Array.from(
    { length: 3 },
    () => limit(() => delay(100)),
  );

  await Promise.resolve();
  assertEquals(limit.activeCount, 5);
  assertEquals(limit.pendingCount, 3);

  await Promise.all(immediatePromises);
  assertEquals(limit.activeCount, 3);
  assertEquals(limit.pendingCount, 0);

  await Promise.all(delayedPromises);

  assertEquals(limit.activeCount, 0);
  assertEquals(limit.pendingCount, 0);
});

Deno.test("clearQueue", async () => {
  const limit = pLimit(1);

  const a = Array.from({ length: 1 }, () => limit(() => delay(100)));
  Array.from({ length: 3 }, () => limit(() => delay(100)));

  await Promise.resolve();
  assertEquals(limit.pendingCount, 3);
  limit.clearQueue();
  assertEquals(limit.pendingCount, 0);

  await Promise.all(a);
});

Deno.test("throws on invalid concurrency argument", () => {
  assertThrows(() => {
    pLimit(0);
  }, TypeError);

  assertThrows(() => {
    pLimit(-1);
  }, TypeError);

  assertThrows(() => {
    pLimit(1.2);
  }, TypeError);

  assertThrows(() => {
    // @ts-expect-error should throw error runtime
    pLimit(undefined);
  }, TypeError);

  assertThrows(() => {
    // @ts-expect-error should throw error runtime
    pLimit(true);
  }, TypeError);
});
