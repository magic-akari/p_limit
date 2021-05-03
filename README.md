# p_limit

similar to [p-limit](https://www.npmjs.com/package/p-limit) but for Deno.

> Run multiple promise-returning & async functions with limited concurrency

## Usage

```js
import { pLimit } from "https://deno.land/x/p_limit@v1.0.0/mod.ts";

const limit = pLimit(1);

const input = [
  limit(() => fetchSomething("foo")),
  limit(() => fetchSomething("bar")),
  limit(() => doSomething()),
];

(async () => {
  // Only one promise is run at once
  const result = await Promise.all(input);
  console.log(result);
})();
```

## API

### pLimit(concurrency)

Returns a `limit` function.

#### concurrency

Type: `number`\
Minimum: `1`\
Default: `Infinity`

Concurrency limit.

### limit(fn, ...args)

Returns the promise returned by calling `fn(...args)`.

#### fn

Type: `Function`

Promise-returning/async function.

#### args

Any arguments to pass through to `fn`.

Support for passing arguments on to the `fn` is provided in order to be able to
avoid creating unnecessary closures. You probably don't need this optimization
unless you're pushing a _lot_ of functions.

### limit.activeCount

The number of promises that are currently running.

### limit.pendingCount

The number of promises that are waiting to run (i.e. their internal `fn` was not
called yet).

### limit.clearQueue()

Discard pending promises that are waiting to run.

This might be useful if you want to teardown the queue at the end of your
program's lifecycle or discard any function calls referencing an intermediary
state of your app.

Note: This does not cancel promises that are already running.

## Acknowledgements

[p-limit](https://www.npmjs.com/package/p-limit)
