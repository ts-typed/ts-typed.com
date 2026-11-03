# Generics

TS Typed can validate values that pass through generic functions and generic classes. The key idea is that the compiler needs a **concrete type** to build a runtime contract — and it gets that concrete type from TypeScript's own checker at the call site, whether you wrote the type argument explicitly or left it for TypeScript to infer.

## Explicit and inferred type arguments

Calling a generic function, or constructing a generic class, validates both the arguments and the result against the concrete type for that call — with an explicit type argument or an inferred one:

```ts
interface Person {
  name: string;
  age: number;
}

function identity<T>(x: T): T {
  return x;
}

identity<Person>(wrongShapedValue); // throws StrictTypeError, validated against Person
identity(wrongShapedValue);         // same check: T is inferred from the argument's own type

class Box<T> {
  constructor(public readonly value: T) {}
}

new Box<Person>(wrongShapedValue); // same, for constructors
new Box(wrongShapedValue);         // and for an inferred constructor call
```

In every case, the value is checked against `Person` at the boundary. If it does not match, a `StrictTypeError` is thrown before the value reaches the function body or the object's fields.

The inferred case isn't limited to a type that comes from the argument itself — it also covers a type argument driven purely by the *expected* type at the call site, when no argument pins it down:

```ts
function response<T>(data: T): { data: T } {
  return { data } as { data: T };
}

const user: Person = { name: 'Ada', age: 36 };
const result = response(user); // T inferred as Person from `user` — validates the full { data: Person } shape
```

This works because `response(user)`'s `T` is resolved from `user`'s own declared type — the same instantiated signature a hover tooltip would show you, with no explicit `<Person>` needed.

## Async return values

The same check applies to the resolved value of an async function. Because the compiler validates it through `.then()`, the call still returns a Promise, and a failed check rejects that Promise:

```ts
async function identityAsync<T>(x: T): Promise<T> {
  return x;
}

const person = await identityAsync<Person>(wrongShapedValue); // rejects with StrictTypeError
```

## Rest parameters and spread arguments

Values that land in a rest parameter are validated too, including values supplied through spread syntax:

```ts
function collect<T>(...items: T[]): T[] {
  return items;
}

collect<number>(1, 2, 'bad'); // throws StrictTypeError on 'bad'
collect(1, 2, 'bad');         // same check: TypeScript would reject this at compile time anyway

const mixed: unknown[] = [1, 2, 'bad'];
collect<number>(...mixed); // same check, applied to the spread values
```

## When inference can't resolve to anything concrete

If a type parameter isn't referenced by any argument and there is no expected type at the call site to drive it from, TypeScript resolves it to `unknown`. TS Typed treats that the same way it treats any other unsupported type: no contract is generated for that boundary, rather than validating against the wrong thing.

## A generic never called or constructed

A generic class or method used only as a type annotation — never actually called or constructed anywhere — has no call site to resolve an instantiated signature from, so this feature has nothing to attach to. When that unresolved type parameter carries an explicit `extends` constraint (`T extends { id: number }`), it's now validated against that constraint instead — reported as `"partial"` coverage rather than `"unsupported"`. With no `extends` (an implicit `unknown` constraint), or when the constraint itself is unsupported, it stays fully unprotected, same as any other unresolved type.

## What's still not covered

Generators are not covered — calling a generator function produces an iterator rather than a single return value, and the yielded values are not validated.

A method whose generic declaration lives in one of TypeScript's own bundled libraries (`Array.prototype.map`, `Promise.resolve`, `Map`/`Set`'s own methods, `new Map(...)`/`new Set(...)` themselves, and so on) is deliberately excluded from this feature. Instrumenting those would mean adding runtime validation to essentially every array/collection operation in a project — far outside the scope of validating a project's OWN generic functions and classes — and some of them (`Map`/`Set`) already get dedicated handling elsewhere (entry validation, [`compiler.enforceMutationGuards`](./configuration.md)).

For the complete list of boundaries in this area, see [Limitations](./limitations.md).
