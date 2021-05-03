import { Queue } from "https://deno.land/x/yocto_queue@v0.1.3/mod.ts";
import type { Limit } from "./mod.d.ts";

export const pLimit = (concurrency: number) => {
  const validConcurrency =
    (Number.isInteger(concurrency) || concurrency === Infinity) &&
    concurrency > 0;

  if (!validConcurrency) {
    throw new TypeError("Expected `concurrency` to be a number from 1 and up");
  }

  const queue = new Queue<() => Promise<void>>();
  let activeCount = 0;

  const generator = <Arguments extends unknown[], ReturnType>(
    runner: (...args: Arguments) => PromiseLike<ReturnType> | ReturnType,
    ...args: Arguments
  ) => {
    const next = () => {
      activeCount -= 1;
      queue.dequeue()?.();
    };

    return new Promise<ReturnType>((resolve, reject) => {
      const run = async () => {
        activeCount += 1;

        try {
          const result = await Promise.resolve(runner(...args));
          resolve(result);
        } catch (error) {
          reject(error);
        }

        next();
      };

      queue.enqueue(run);

      queueMicrotask(() => {
        if (activeCount < concurrency) {
          queue.dequeue()?.();
        }
      });
    });
  };

  Object.defineProperties(generator, {
    activeCount: {
      get: () => activeCount,
    },
    pendingCount: {
      get: () => queue.size,
    },
    clearQueue: {
      value: () => {
        queue.clear();
      },
    },
  });

  return generator as Limit;
};
