# Benchmarks

These measurements show the cost of runtime contracts in the reference projects. They are guidance, not a promise for every CPU, Node.js version, database driver, payload, or network.

## Method

The HTTP scenarios use Node 22.22.3, TypeORM 0.3.28, better-sqlite3 12.11.1, real Express and Nest servers, five samples of 20 requests, and concurrency 4. The internal scenarios run in memory. Baseline means no TS Typed runtime; typed paths validate the response. Values are estimated milliseconds per request.

## Representative results

| Scenario | Baseline | TS Typed immutable | Mutable protection |
| --- | ---: | ---: | ---: |
| Express, 50 users | 1.193 ms | 1.395 ms | 2.120 ms |
| Express, 10,000 users | 52.15 ms | 124.75 ms | 245.13 ms |
| NestJS, 50 users | 1.030 ms | 1.380 ms | 2.160 ms |
| NestJS, 10,000 users | 55.61 ms | 124.22 ms | 249.76 ms |

The immutable path uses `TTOptImmut`: validate the object graph once and freeze the resulting POJO. The mutable path installs runtime protection on each object. The difference grows with object count, so pagination and public projections usually matter more than micro-optimising the guard.

## How to read this

- A small response can be dominated by socket and JSON overhead; a tiny difference is noise.
- A large response multiplies the cost of traversing and protecting objects.
- Select public columns and map entities to DTOs before the boundary. Never return secrets merely to remove them later.
- Re-run the benchmark with your schema and deployment hardware before setting a latency budget.

The benchmark source and exact command lines are maintained with the repository. CLI-dependent commands in this page require final factual review before publication; this page intentionally does not invent compiler flags.

These numbers pre-date the lazy mutation guards covered in [Performance](./performance.md#lazy-mutation-guards). An HTTP response that gets fully serialized reads every field anyway, so the "Mutable protection" column above is not expected to move much from that change — the measured win is specific to a subtree that crosses a boundary but is never fully read afterward.
