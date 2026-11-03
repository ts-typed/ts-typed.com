# Core Concepts

TS Typed is built around one idea: a value is checked where it crosses a **typed boundary**, against the type declared at that exact point. This page explains the idea, what is checked, and how violations are reported.

## Typed boundaries

A typed boundary is a place in your code where a value enters a declared type. The compiler finds every one of these in your project using the TypeScript type checker:

- **Variable declarations**, such as `const user: User = input;`
- **Function parameters**, when a caller passes an argument
- **Return statements**, when a function produces a value
- **Class field assignments**
- **Casts**, such as `value as User`
- **`satisfies` expressions**

At each boundary, the compiler inserts a runtime check built from the declared type at that point. You do not write these checks, and you do not maintain a separate schema for them.

```ts
export function greet(user: { name: string; age: number }): string {
  return `Hello, ${user.name}`;
}
```

The parameter `user` is a typed boundary. Calls that pass a value with the wrong shape fail at the point of entry, before the function body runs.

## What gets checked

The runtime checks cover the types you already use:

- **Primitives and literals**: `string`, `number`, `boolean`, `bigint`, `symbol`, and literal types. `null` and `undefined` are distinguished correctly. `NaN` and `Infinity` are accepted as ordinary numbers, with no domain checks applied — unless the field is typed with [`Int`/`Float`/`Str`](#ranged-values-int-float-str), which rejects them and enforces its own min/max bound.
- **Unions, intersections, and tuples**, including template literal types.
- **Objects are closed by default.** An object with an extra, undeclared property fails with `EXTRA_PROPERTY`. This is stricter than plain TypeScript, which allows extra properties in many positions. To opt out, use the `AllowExtraProperties()` decorator on a class or set the `allowExtraPropertiesAll` config flag.
- **Dates.** `Date` is validated as a real `Date` instance, not as any object.
- **Branded types.** A type such as `type UserId = string & { __brand: 'UserId' }` is accepted at its underlying primitive type.
- **Classes.**
  - `private` and `protected` fields are enforced when `compiler.enforcePrivate` is enabled.
  - `readonly` fields are enforced when `compiler.enforceReadonly` is enabled. Fields declared with `?` or `!` are skipped, so libraries such as `class-transformer` can populate them after construction.
  - Required fields are locked as non-configurable, starting from the most-derived constructor.
  - `static` fields are checked.
- **Destructuring.** In `const { age }: Profile = value;`, the whole source value is validated before any binding is extracted.
- **Type guards and assertion functions.** A user-defined `x is T` validates its target when it returns `true`. An `asserts x is T` function validates at every normal return path.
- **`Map`, `Set`, `ReadonlyMap`, and `ReadonlySet`.** Entries are validated against the declared key, value, and item types. `WeakMap` and `WeakSet` are not supported, because their contents cannot be iterated.
- **Generators, `async`/`await`, and explicit-generic calls and constructors.**
- **CommonJS module bindings.** An exported `let` or `var` is guarded on the `exports` object itself.

## Ranged values: `Int`, `Float`, `Str`

`Int`, `Float`, and `Str` put a min/max constraint directly in the type, with no decorator or validator class needed:

```ts
import type { Int, Float, Str } from '@ts-typed/core';

class SignupDto {
  age: Int<0, 150>;     // integer, 0..150
  rating: Float<0, 5>;  // any finite number, 0..5
  nickname: Str<1, 20>; // string, length 1..20
}
```

- `Min`/`Max` (`MinLen`/`MaxLen` for `Str`) are each **independently optional** — leave one out to check only the other:
  ```ts
  type Count = Int<0>;          // >= 0, no upper bound
  type Page = Int<number, 100>; // <= 100, no lower bound
  ```
- `Int` requires an integer (`Number.isInteger`); `Float` accepts any finite number. Both reject `NaN` and `±Infinity` regardless of bounds.
- Wrapping the type in your own alias keeps the constraint: `type Age = Int<0, 150>;` behaves exactly like using `Int<0, 150>` directly.
- A violation is reported the same way as any other mismatch: `StrictTypeError` with `code: 'TYPE_MISMATCH'` and an `expected` describing the bound that failed (e.g. `"integer >= 0 and <= 150"`).
- `Min` greater than `Max` (e.g. `Int<150, 0>`) is an authoring mistake, not a type-system limitation: it is reported through the same `compiler.onUnsupported` lever as any other unsupported contract (`"warn"` by default, `"error"` fails the build on it — see [Configuration](./configuration.md)).
- Because `Int`/`Float`/`Str` are ordinary (branded) TypeScript types, hovering a field typed with one in an editor shows the constraint (`Int<0, 150>`), not just `number` — there is nothing to configure for that; it falls out of how the type is declared.
- This complements [`@ts-typed/validators`](./validators.md)'s `ValueObject`-based validators (`CPF`, `Email`, ...), it does not replace them: reach for `Int`/`Float`/`Str` for a plain bound on a primitive, and for `ValueObject` when the value needs its own identity/methods (formatting, masking, domain-specific checks).

## Errors: `StrictTypeError`

Every violation throws a `StrictTypeError`. It is a subclass of `TypeError`, so existing `instanceof TypeError` handling keeps working.

```ts
class StrictTypeError extends TypeError {
  code: 'TYPE_MISMATCH' | 'EXTRA_PROPERTY' | 'REQUIRED_PROPERTY' | 'READONLY_PROPERTY' | 'INVALID_MUTATION';
  propertyPath: string;   // e.g. "CreateUserDto.email"
  expected: string;
  received: string;
  contractKind: 'variable' | 'parameter' | 'property' | 'return' | ...;
  operation: string;      // e.g. "initialize" | "set" | "argument" | "return" | "mutate"
  className?: string;
  functionName?: string;
  toJSON(): {
    code: string;
    propertyPath: string;
    expected: string;
    received: string;
    contractKind: string;
    operation: string;
    className?: string;
    functionName?: string;
  };
}
```

Each field tells you something specific about the failure:

- **`code`** classifies the violation:
  - `TYPE_MISMATCH`: the value has the wrong type.
  - `EXTRA_PROPERTY`: the object has a property the type does not declare.
  - `REQUIRED_PROPERTY`: a required property is missing.
  - `READONLY_PROPERTY`: a `readonly` field was written to after it was initialized.
  - `INVALID_MUTATION`: a value was changed in a way the declared type does not allow.
- **`propertyPath`** points to the failing location, such as `CreateUserDto.email`.
- **`expected`** and **`received`** describe the declared type and the observed shape.
- **`contractKind`** says what kind of boundary failed, such as a variable, parameter, property, or return value.
- **`operation`** says what the runtime was doing, such as `initialize`, `set`, `argument`, `return`, or `mutate`.
- **`className`** and **`functionName`** identify the enclosing class or function when they apply.

### Safe to log

`toJSON()` returns the fields above and nothing else. It never includes the raw value that failed validation, and it never includes a stack trace. You can log or serialize the error without leaking the input it rejected.

```ts
try {
  createUser(payload);
} catch (error) {
  if (error instanceof StrictTypeError) {
    logger.warn(error.toJSON());
  }
}
```

## Fail-fast behavior

TS Typed is fail-fast. The first violation it finds throws immediately. It does not walk the whole object and collect every problem into one aggregated error, as some validation libraries do.

Consider this input:

```ts
class CreateUserDto {
  public name!: string;
  public age!: number;
  public email!: string;
}

createUser({ name: 42, age: 'thirty', email: 'ana@example.com' });
```

The check reports the first mismatch it reaches, for example `name`, and throws. It does not also report `age`. After you fix `name`, the next request may surface `age`.

This keeps the failure path simple and cheap. The error describes one concrete problem, and the code that handles it never has to interpret a list of issues.

If you need every violation reported together — the class-validator-style model — decorate the class with `AggregateErrors()` and TS Typed will collect every violation it finds in a value crossing a parameter boundary, instead of stopping at the first. It is opt-in and narrowly scoped; see [`AggregateErrors()`](./decorators.md#aggregateerrors) for exactly where it applies and where it does not.
