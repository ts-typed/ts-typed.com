# Limitations

TS Typed is intentionally scoped. The limitations below are **deliberate scope boundaries, not oversights**. Each one is a choice about what the compiler will and will not promise, and this page lists them plainly so you can plan around them.

## Validation model

- **Multiple violations are not aggregated by default.** Decorating a class with [`AggregateErrors()`](./decorators.md#aggregateerrors) opts it into collecting them at a parameter boundary, including after `class-transformer` populates the DTO through NestJS's `ValidationPipe({ transform: true })`. A decorated nested DTO is also drained while an enclosing object, array, tuple, `Map`, or `Set` is structurally checked, so rejected writes cannot be silently accepted. The remaining boundaries are deliberate: an array-typed **parameter itself** (`dtos: Dto[]`) remains fail-fast after its first bad element; a namespace-qualified decorator call is not detected; a `TypeErrorResponse()` override is not folded into the aggregate's inherited first-error fields; and a `ValueObject` field with invalid raw input throws immediately rather than joining the aggregate. A decorated instance that never reaches a typed parameter boundary keeps its collection window open until garbage collection closes it and reports any buffered violations through a `console.error` warning rather than a throw; call [`closeAggregateWindowOrThrow()`](./decorators.md#aggregateerrors) right after manual population (e.g. a `plainToInstance` call outside a typed boundary) to close the window explicitly and throw synchronously instead.

## Collections

- **`WeakMap` and `WeakSet` are unsupported at the schema level.** This is not only a runtime gap. They cannot be iterated, so there is nothing to validate at a boundary crossing.
- **Mutation guards only cover what they wrap.** A guard wraps the boundary-crossing value and its nested containers at the moment the guard is created, and again whenever a new value is written through it. Some paths bypass the guard:
  - A raw reference taken before the boundary.
  - A Set's pre-existing items. They cannot be swapped out without changing iteration order.

## Generics

- **Unused generic classes and methods are not covered.** Generic calls and constructions, including inferred arguments, are resolved at their call site. But a generic type used only as an annotation, without a concrete call or construction, provides no instantiated signature to transport to runtime.
- **A method whose generic declaration lives in one of TypeScript's own bundled libraries is excluded.** `Array.prototype.map`, `Promise.resolve`, `Map`/`Set`'s own methods, `new Map(...)`/`new Set(...)` themselves, and so on, are deliberately out of scope — see [Generics](./generics.md#whats-still-not-covered) for why.
- **`yield*` delegation is not validated by the outer function.** `yield` and the return value of generators/async generators are validated; delegation is preserved without rewriting. The delegated generator remains protected when it has its own typed boundary.

## Module output

- **AMD, UMD, and System module output are not covered by the CommonJS `exports` guard.** The `let x; export { x };` list form is also not covered by that guard. ESM needs no equivalent, because module namespace objects are already non-writable by specification.

## `ValueObject` detection

- **A `ValueObject` subclass is not auto-constructed when it is reached only through:**
  - inference;
  - a namespace import;
  - an import that is not named explicitly in the file doing the resolving.
- **A union that includes a `ValueObject` type does not auto-construct.** For example, `CPF | undefined` does not auto-construct.
- **A class reached through a symlinked or workspace `node_modules` install is not detected.**

---

If one of these limitations blocks your use case, the right next step is usually to adjust the boundary: make the type explicit, import the class by name, or keep a validation step of your own where TS Typed does not reach. For mechanisms that cover these areas, see [Decorators](./decorators.md), [Generics](./generics.md), [Performance](./performance.md), and [Optimizations](./optimizations.md).
