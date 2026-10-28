# Configuration

TS Typed reads its settings from a `typets.config.json` file at the root of your project. Run `npx ts-typed init` to generate one with sensible defaults, then adjust the keys you need.

```json
{
  "entry": "src/main.ts",
  "tsconfig": "tsconfig.json",
  "outDir": "dist",
  "integration": "typescript",
  "allowExtraPropertiesAll": false,
  "compiler": {
    "onUnsupported": "warn",
    "strictClass": true,
    "enforcePrivate": true,
    "enforceReadonly": true,
    "enforceClosedInstances": false,
    "enforceMutationGuards": false,
    "sourceMap": true
  },
  "diagnostics": {
    "format": "pretty",
    "coverage": "summary",
    "reportFile": null
  },
  "ncc": {}
}
```

Every key is optional. Anything you leave out takes the default shown below.

## Reference

The table below lists every configuration key, its default value, and what it controls.

| Key | Default | Meaning |
|---|---|---|
| `entry` | `"src/main.ts"` | Project entry point. |
| `tsconfig` | `"tsconfig.json"` | TypeScript config to compile with. |
| `outDir` | `"dist"` | Output directory. |
| `integration` | `"typescript"` | Framework adapter (e.g. `"nestjs"`). |
| `allowExtraPropertiesAll` | `false` | Globally allow extra properties on every object boundary (same effect as `AllowExtraProperties()` everywhere). |
| `compiler.onUnsupported` | `"warn"` | `"warn"` or `"error"` when a type can't be given a runtime contract (e.g. a generic type parameter with no concrete type). |
| `compiler.strictClass` | `true` | Default nominal (`instanceof`) vs. structural validation for class-typed values. `instanceof` is embedded whenever the compiler can reach the class — same file, or another file when it's imported there by name. Override per class with `StrictClass()`/`StructuralClass()` decorators. |
| `compiler.enforcePrivate` | `true` | Instrument `private`/`protected` class fields. |
| `compiler.enforceReadonly` | `true` | Lock a `readonly` class field after its first validated assignment (skipped for `?`/`!` fields). |
| `compiler.enforceClosedInstances` | `false` | **Opt-in.** Seal a class instance (`Object.preventExtensions`) once its most-derived constructor completes — no new property can be added afterward. |
| `compiler.enforceMutationGuards` | `false` | **Opt-in.** Wrap an array/Map/Set/plain-object crossing a typed boundary in a Proxy that validates mutations (push/splice/index writes, `.set()`/`.add()`, delete/defineProperty, nested containers too) instead of only checking the value once at the boundary. |
| `compiler.sourceMap` | `true` | Emit source maps. |
| `diagnostics.format` | `"pretty"` | `"pretty"` or `"json"` coverage output. |
| `diagnostics.coverage` | `"summary"` | `"summary"` or `"detailed"`. |
| `diagnostics.reportFile` | `null` | Write the coverage report to a file instead of stdout. |
| `ncc.*` | — | Bundling options passed through to `@vercel/ncc`: `enabled`, `minify`, `target`, `externals`, `cache`, `license`, `quiet`, `debugLog`. |

## About the two opt-in flags

Two compiler options are **off by default**: `compiler.enforceClosedInstances` and `compiler.enforceMutationGuards`. They are not experimental or half-finished. They are off because each one trades off against conventions that other libraries in the Node.js ecosystem rely on, so turning them on is a decision you should make deliberately.

### `enforceClosedInstances`

Sealing a class instance prevents any property from being added after its most-derived constructor completes. That is a strong guarantee, but it conflicts with a very common NestJS pattern: `class-transformer` combined with `ValidationPipe({ whitelist: true })`.

That pipeline first copies every key from the request body onto a fresh `new Dto()` instance, and only afterwards strips the keys that are not whitelisted. With sealing enabled, the first copy throws on the first unexpected key, before the whitelist step has a chance to run.

If you enable this option, configure `class-transformer` so it only ever writes declared keys in the first place. The usual approach is `excludeExtraneousValues: true` together with `@Expose()` on every property you accept:

```ts
import { Expose, plainToInstance } from 'class-transformer';

class CreateUserDto {
  @Expose() public readonly name!: string;
  @Expose() public readonly email!: string;
}

const dto = plainToInstance(CreateUserDto, body, {
  excludeExtraneousValues: true,
});
```

### `enforceMutationGuards`

This option wraps the value that crosses a typed boundary in a Proxy, so every later mutation (`push`, index writes, `.set()`, `delete`, and so on) is validated as well. That protection has two costs you should account for:

- **Runtime cost.** Every mutation runs a validation check, so hot code paths that mutate large collections pay for it on every write.
- **Identity change.** The value you receive is a Proxy, not the original reference. Comparisons with `===` against a reference you kept from before the boundary will fail, and a raw reference taken before the boundary bypasses the guard entirely.

Enable it when the cost is acceptable and the guarantee matters more to you than object identity.

> **The governing rule.** TS Typed's configuration decides how the compiler behaves, and the rest of your stack must be configured to agree with it. When the two disagree, for example a `class-transformer` setup that writes undeclared keys into a sealed instance, the mismatch is an application configuration bug, not a TS Typed bug. Check the rest of your stack before reporting one.
