# Decorators

TS Typed ships a small set of decorators that adjust how the compiler validates a class or a property. Every decorator is imported from `@ts-typed/core`:

```ts
import {
  AllowExtraProperties,
  StrictClass,
  StructuralClass,
  ServerPopulated,
  TypeErrorResponse,
  AggregateErrors,
} from '@ts-typed/core';
```

Each decorator overrides a default for a single target. The global settings in `typets.config.json` still apply everywhere else.

### `AllowExtraProperties()`

`AllowExtraProperties()` is a class or property decorator. It allows extra, undeclared properties on the decorated class, or on the value of one decorated property. It is the per-target override of the global `allowExtraPropertiesAll` flag.

```ts
@AllowExtraProperties()
class LooseConfig {
  public readonly host!: string;
  // Any additional keys are accepted and kept.
}
```

Use it for objects that intentionally carry extra data, such as configuration blobs or third-party payloads you only partially care about. Everywhere else, keep the default strict behavior so that unexpected keys are reported.

### `StrictClass()` / `StructuralClass()`

These are class decorators that control how class-typed values are checked at a boundary:

- **`StrictClass()`** forces **nominal** validation. A value passes only if it is an actual instance of the class (`instanceof`).
- **`StructuralClass()`** forces **structural** validation. A value passes if its shape matches the class, whatever its prototype chain.

Both override the global `compiler.strictClass` default for that one class, whichever way the default is set. Subclasses inherit the setting from their parent unless they declare their own.

```ts
@StrictClass()
class Money {
  public readonly amount!: number;
  public readonly currency!: string;
}

@StructuralClass()
class Point {
  public readonly x!: number;
  public readonly y!: number;
}
```

### `ServerPopulated()`

`ServerPopulated()` is a class decorator that marks a class whose instances are filled in by the server or the database, not by client input. The intended use is a TypeORM `@Entity()` class.

When a field of a `ServerPopulated` class fails validation, the `StrictTypeError` carries `isServerPopulated: true`. That flag is never included in `toJSON()`. It is the compiler-side half of telling a corrupted field in an Entity apart from bad input in a DTO: a failing Entity field is a server-side problem, while a failing DTO field is the client's fault.

```ts
import { Entity } from 'typeorm';
import { ServerPopulated } from '@ts-typed/core';

@Entity({ name: 'todos' })
@ServerPopulated()
export class TodoEntity {
  // ...columns and fields
}
```

On the NestJS side, `@ts-typed/nestjs`'s `StrictTypeErrorFilter` reads this flag and answers with HTTP `500` instead of `400`, so an internal data problem is not reported to the client as a bad request.

### `TypeErrorResponse(message, status?)`

`TypeErrorResponse` is a property decorator. It attaches a custom, HTTP-facing message and an optional status code to a specific field:

```ts
import { TypeErrorResponse } from '@ts-typed/core';

export class CreateUserDto {
  @TypeErrorResponse('Invalid email', 422)
  public readonly email!: string;
}
```

When a `StrictTypeError` is thrown for that field, it carries `typeErrorResponseMessage` and `typeErrorResponseStatus`. Like the `ServerPopulated` flag, these properties are never included in `toJSON()`.

On its own, this package has no HTTP awareness. `@ts-typed/nestjs`'s `StrictTypeErrorFilter` and `StrictTypeHttpError` are what turn these fields into an actual HTTP response. Think of `TypeErrorResponse` as a per-property alternative to the messages you would otherwise write with class-validator.

**Important:** `TypeErrorResponse` is still a fail-fast mechanism. It customizes the response for whichever **one** violation fires on that property. It is not an aggregate of every violation across the object. For that, see `AggregateErrors()` below.

### `AggregateErrors()`

`AggregateErrors()` is a class decorator. It opts a class into collecting **every** violation found in it, at any depth, into a single `AggregateStrictTypeError`, instead of TS Typed's default fail-fast behavior (first violation only).

```ts
import { AggregateErrors, AggregateStrictTypeError } from '@ts-typed/core';

@AggregateErrors()
class CreateUserDto {
  public name: string = '';
  public age: number = 0;
}

function createUser(dto: CreateUserDto): void { /* ... */ }

try {
  createUser({ name: 42, age: 'old' } as any);
} catch (error) {
  if (error instanceof AggregateStrictTypeError) {
    console.log(error.errors); // every violation, not just the first
  }
}
```

This is scoped narrowly, on purpose:

- **It only changes behavior at the parameter boundary** — a function or method argument, the shape a request body takes when it reaches a handler. Construction, a field write after construction, a variable, and a return value all stay fail-fast regardless of this decorator. There is no "whole form" to aggregate at a single-field write.
- **It walks nested objects and arrays to full depth**, including an optional or nullable nested value (`profile?: Profile`, `profile: Profile | null`) — as long as exactly one non-nullish branch of that field's type is object- or array-shaped. A field whose type has two or more genuinely ambiguous object-shaped branches reports one generic violation for that field instead.
- **Detection is static.** The compiler reads the decorator directly off the class declaration, so it works regardless of which file declares the class — the normal case, since a DTO is almost always imported from its own file.
- `AggregateStrictTypeError extends StrictTypeError`, so every existing `instanceof StrictTypeError` check — your own `try`/`catch`, `@ts-typed/nestjs`'s `StrictTypeErrorFilter` — keeps working unchanged. It sees the first violation's fields through the inherited properties, with the full list additionally available as `.errors`.

`AggregateErrors()` also works with `class-transformer`'s `plainToInstance`, including Nest's `ValidationPipe({ transform: true })`. A decorated DTO opens a temporary aggregate window after construction: invalid field writes made while `plainToInstance` populates it are collected, and the next typed parameter boundary merges them with the complete structural check. That also catches missing required fields and undeclared keys. A decorated nested DTO is drained when its enclosing object, array, tuple, `Map`, or `Set` is structurally checked, so an invalid field write cannot be silently accepted by retaining its old default value.

Keep this for DTO-style values that are constructed and immediately passed through a typed parameter. A decorated instance that is mutated indefinitely without reaching such a boundary keeps its window open until it is garbage-collected, at which point any still-buffered violations are only reported through a `console.error` warning (customizable via `setAggregateWindowLeakHandler`) — not thrown, since there is no caller left to catch anything, and not on any predictable schedule, since GC timing isn't. Invalid raw input for a `ValueObject` field still throws immediately instead of joining the aggregate; see [Limitations](./limitations.md).

If you populate a decorated instance by hand — most commonly `plainToInstance` outside of a typed parameter boundary, such as inside a custom `ValidationPipe` before the controller method runs — and nothing will ever cross it through a typed parameter afterward, call `closeAggregateWindowOrThrow(instance)` right after populating it:

```ts
import { AggregateErrors, closeAggregateWindowOrThrow } from '@ts-typed/core';
import { plainToInstance } from 'class-transformer';

@AggregateErrors()
class CreateUserDto {
  public name: string = '';
  public age: number = 0;
}

const dto = plainToInstance(CreateUserDto, rawBody);
closeAggregateWindowOrThrow(dto); // throws AggregateStrictTypeError with every violation, synchronously
```

This closes the window immediately and, if anything was buffered, throws `AggregateStrictTypeError` with every collected violation right there — no waiting on GC, no `console.error` fallback, no race. It is a no-op (no throw) when the window was never open, or open but empty, so it's safe to call defensively even when you're not sure whether anything was collected.
