# Performance & benchmarks

These are local references, not an SLA. The battery uses Node 22.22.3 with 7
samples after 2 warmups, comparing the same fixture compiled by plain `tsc`
(baseline) and `ts-typed build` (typed).

| Scenario | Without TS Typed | With TS Typed | Impact |
| --- | ---: | ---: | ---: |
| Express, 1 user | 0.811 ms | 0.650 ms | local noise |
| Express, 50 users | 0.481 ms | 3.473 ms | 7.2x |
| Express, 10,000 users | 5.455 ms | 311.306 ms | 57.1x |
| Express, 10,000 + `TTOptImmut` | 5.455 ms | 198.085 ms | 1.57x better than normal typed |
| CSV, 1,000 rows | 0.493 ms | 21.919 ms | 44.5x |
| CSV, 10,000 rows | 3.758 ms | 201.496 ms | 53.6x |
| CSV, 50,000 rows | 18.267 ms | 1,142.554 ms | 62.5x |

Express removes `passwordHash` before responding and validates `Email`. The CSV
script parses, normalizes, and rejects invalid email rows. Every safe result is
checked to ensure the secret field is absent.

These numbers pre-date the lazy mutation guards described below, but they stay
representative for this specific battery: every scenario above reads every
field of every item before responding, and that is exactly the case lazy
guards do **not** speed up — see [Lazy mutation guards](#lazy-mutation-guards)
for where the win actually shows up. A same-machine before/after run of this
project's own CSV hot-path (parse/transform/strip-passwords, 500 rows)
confirmed the two are statistically identical.

## Lazy mutation guards

Installing a mutation guard on an array item or object property used to mean
eagerly wrapping every nested item/property in a `Proxy` at the moment a
value crossed a typed boundary, whether or not anything downstream ever read
that slot. Guards are now installed lazily, on the first `get` of each slot,
and memoized so a later read of the same slot returns the identical proxy — a
`set` still validates and wraps synchronously exactly as before. This changes
only *when* a subtree's own protection is installed, never whether a real
mutation is detected.

The saving only shows up for a subtree that is **not** fully read afterward: a
reproducible before/after in this package's own benchmark suite
(`benchmarks/runtime-benchmark.cjs`, "Lazy mutation guards" section) measured
453,770 ns/op for a 200-item array boundary crossing that is never read
afterward, versus 858,901 ns/op for the same crossing followed by reading
every item — structural validation cost dominates the fully-read case, so the
isolated guard-installation saving is real but narrow in scope.

A Set item and a Map key are the one exception — their identity can never be
swapped for a Proxy without breaking iteration order or key lookups — so they
keep the previous eager wrap for their own nested children.

## Cross-file schema memoization

A generic type used in several files of the same build (for example,
`Repository<User>` imported by many services) is resolved once per build, not
once per file. The TypeScript checker reuses the same underlying type object
for identical generic instantiations within one program, and the schema
resolver was already caching by that object's identity — confirmed with a
dedicated regression test, no code change was needed for this part.

## Reproduce

```bash
node benchmarks/exhaustive-battery.cjs
```

For the 10,000-entity TypeORM/Express/NestJS stress case, also run the harness
in `benchmarks/performance`. In production, paginate before returning thousands
of items; batch size is the largest cost multiplier.

## Interpretation

`protectValue` keeps mutable values safe and pays for accessors and repeated
traversals. `TTOptImmut<T>` validates and freezes fresh POJOs, so it is faster
for read-only output DTOs but is not suitable for entities, classes, or accessor
objects. For large CSV pipelines, reduce intermediate copies, use batching or
streaming, and measure parsing, validation, and writing separately.
