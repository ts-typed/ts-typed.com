# Changelog

All notable changes to `@ts-typed/validators` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.18] - 2026-11-03

### Changed

- Bumped the `@ts-typed/core` peer/dev dependency to `0.7.0`. This range was
  never advanced through `0.5.0`/`0.6.0`; it now jumps straight to `0.7.0`,
  which adds ranged `Int`/`Float`/`Str` types, compiled-validator codegen,
  lazy guards, cross-file schema memoization, and closes 4 previously
  documented limitations (see `@ts-typed/core`'s own CHANGELOG for details).
  No behavior change in this package itself.

## [0.1.17] - 2026-10-28

### Changed

- Bumped the `@ts-typed/core` peer/dev dependency to `0.4.0`. That release
  resolves `instanceof` across files for `compiler.strictClass`/`@StrictClass()`
  (when the class is imported by name) and flips `compiler.strictClass`'s
  global default to `true` (breaking). Set `compiler.strictClass: false` or
  decorate a class with `@StructuralClass()` to keep the previous behavior.

## [0.1.16] - 2026-10-27

### Changed

- Bumped the `@ts-typed/core` peer/dev dependency to `0.3.0`, to pick up
  `closeAggregateWindowOrThrow()` and array-of-DTOs parameter aggregation,
  and to avoid a dual-module-instance of `@ts-typed/core` from a stale pin.

## [0.1.15] - 2026-10-27

### Changed

- Bumped the `@ts-typed/core` peer/dev dependency to `0.2.0`. The previous
  published peer range (`>=0.1.36 <0.2`) was never republished when the
  peer dep was last updated in source, so `npm install` kept pulling an
  incompatible pair and risked a dual-module-instance of `@ts-typed/core`.

## [0.1.12] - 2026-10-21

### Fixed

- **`CNH` rejected a whole class of otherwise-valid numbers.** The second
  check digit's "value above 9 becomes 0" rule was applied only to the
  un-adjusted value, not after the `+11` adjustment for a first check digit
  of 10 — so a prefix landing on that combination computed a required check
  digit of 10, which no single digit can ever equal, making that CNH
  permanently unconstructable. About 1 in 121 valid prefixes were affected.
- **`FullName` rejected an NFD-decomposed accented name** (each accented
  letter as a base letter plus a separate combining mark — common for text
  read from a macOS filesystem or some input methods), even though the
  visually identical NFC form was accepted. Input is now NFC-normalized
  before the character-class check and before `firstName()`/`lastName()`/
  `redact()`, so both forms behave identically.

### Changed

- Synced the `@ts-typed/compiler` peer/dev dependency to `0.1.35`.

## [0.1.11] - 2026-10-21

### Fixed

- **`CNPJ` accepted an all-same-character sequence** (e.g. `"00000000000000"`),
  because only `CPF` and `PIS` had the repeated-digit guard. Added the same
  guard to `CNPJ`, covering both the legacy numeric and alphanumeric formats.
- **`Email` accepted malformed addresses** such as `"a..b@example.com"`,
  `".a@example.com"`, `"a.@example.com"`, and a domain label starting or
  ending with a hyphen (`"a@-x.com"`). The format check now rejects
  leading/trailing/consecutive dots and hyphen-led/trailed domain labels.
- **`FullName` accepted a word made only of apostrophes or hyphens** (e.g.
  `"- -"`), since the character class allowed those punctuation marks without
  requiring an actual letter. Each word must now contain at least one letter.

### Changed

- **`@ts-typed/compiler` moved from a pinned `dependencies` entry to a
  `peerDependencies` range (`>=0.1.34 <0.2`)**, with `0.1.34` as a
  `devDependencies` pin for local builds/tests. Every prior release bumped an
  exact `dependencies` version to keep a single compiler runtime instance
  shared with the application — this instead removes the need to republish on
  every compiler patch, the same structural fix `@ts-typed/express` applied in
  `fix: share compiler runtime as peer dependency`.

## [0.1.10] - 2026-10-20

### Changed

- Bumped the exact `@ts-typed/compiler` dependency to `0.1.31` so validators
  share the compiler runtime identity used by applications and the Nest filter.

## [0.1.9] - 2026-10-20

### Fixed

- Updated the exact `@ts-typed/compiler` dependency to `0.1.30`. This preserves one shared `StrictTypeError` and `ValueObject` runtime with the Nest adapter, so invalid validator-backed request input remains a safe HTTP 400 response.

## [0.1.8] - 2026-10-20

### Fixed

- Updated the exact `@ts-typed/compiler` dependency to `0.1.28`. This preserves a single shared `StrictTypeError` and `ValueObject` runtime when the validators, compiler, and Nest integration are installed together, so invalid value-object request input remains an HTTP 400 rather than being misclassified as an unexpected 500.

## [0.1.7] - 2026-10-19

### Changed

- Bumped the exact `@ts-typed/compiler` dependency to `0.1.27`. This keeps `ValueObject` and `StrictTypeError` identity shared with applications and the Nest integration; without it, a CPF validation error can bypass `StrictTypeErrorFilter` and incorrectly become a generic 500 response.

## [0.1.6] - 2026-10-19

### Changed

- Bumped the `@ts-typed/compiler` dependency to `0.1.26` (adds the `AggregateErrors()` class decorator). No changes to this package's own code. Keeping this pin in lockstep with `@ts-typed/compiler`'s published version avoids a dual-module-instance bug: an app installing both `@ts-typed/validators` and `@ts-typed/compiler` directly must resolve to a single shared copy of the compiler's runtime, or `instanceof StrictTypeError`/`instanceof ValueObject` checks silently fail across the two separately-loaded copies.

## [0.1.5] - 2026-10-19

### Changed

- Widened the supported range to `Node >=18` (from `>=22`) and `TypeScript >=5.4 <7` (from `>=5.9 <6`), matching the relaxed floor in `@ts-typed/compiler` 0.1.25. Bumped the `@ts-typed/compiler` dependency to `0.1.25`.

## [0.1.4] - 2026-10-19

### Changed

- Bumped the `@ts-typed/compiler` dependency to `0.1.24` (tsconfig "paths" aliases are now resolved and rewritten at build time). No changes to this package's own code.

## [0.1.3] - 2026-10-19

### Changed

- Bumped the `@ts-typed/compiler` dependency to `0.1.23` (generic call/construct validation now also covers inferred type arguments, not just explicit ones). No changes to this package's own code.

## [0.1.2] - 2026-10-18

### Changed

- **`FullName` is no longer Brazil-specific.** Moved from `@ts-typed/validators/br` to a new `@ts-typed/validators/global` entry point (also re-exported from the package root). It no longer validates against `./br`'s exports — `require('@ts-typed/validators/br').FullName` is now `undefined`.

### Added

- A new `@ts-typed/validators/global` entry point for validators meant for universal/international use, exporting `FullName`, `Email`, and `CreditCard`.
- `Email`: validates `local-part@domain.tld` pragmatically (not full RFC 5322) — local part allows letters/digits/`._%+-`, domain allows letters/digits/hyphens/dots, must end in a 2+ letter TLD. Adds `.localPart()`, `.domain()`, and `.redact()` (keeps the local part's first character, masks the rest, shows the domain in full: `"ana@example.com"` -> `"a**@example.com"`).
- `CreditCard`: validates a payment card number with the Luhn checksum (network-agnostic, works across card networks worldwide). Accepts spaces/hyphens as separators; the cleaned value must be 12-19 digits and pass the Luhn check. Adds `.numbers()`, `.masked()` (last 4 digits shown, rest masked in groups of 4: `"4532015112830366"` -> `"**** **** **** 0366"`), and `.redact()` (same as `.masked()`).

## [0.1.1] - 2026-10-18

### Added

- A new `FullName` validator: confirms a value looks like a plausible Brazilian full name (at least two words of letters — including accented characters, apostrophes, hyphens), with `.firstName()` (the first word) and `.lastName()` (everything after the first word).
- A `.redact()` privacy-masking method on every class except `CEP`'s own numeric-only predecessor behavior changed too (see below):
  - `CPF`: `"123.456.789-09"` -> `"***.456.789-**"` (hide the first group and the check digits).
  - `CNPJ`: hide the first group and the check digits (works for both the legacy numeric and alphanumeric formats).
  - `PIS`/`Pasep`/`Nis`/`Nit`: hide the first group and the final check digit.
  - `CNH`: hide the first 3 and last 2 of its 11 digits.
  - `Placa`: show the 3-letter prefix, mask everything after it (`"ABC1234"`/`"ABC1D23"` -> `"ABC****"`).
  - `CEP`: hide the first 5 digits (area/sector), show only the last 3 (`"12345-678"` -> `"*****-678"`).
  - `FullName`: every word reduced to its first letter plus one asterisk per remaining character (`"Ana Maria Silva Santos"` -> `"A** M**** S**** S*****"`).

  None of these formats are mandated by a single federal standard — Brazil has no unified rule for this (there's an open legislative proposal asking for one, because fragmented masks across institutions make them easier to reverse-engineer). `CPF`'s format matches a real, documented state transparency-portal convention; the others follow the same principle for consistency, not independent sourcing per document type. `CNPJ` identifies a legal entity, not a natural person — LGPD's personal-data protections don't apply to it the way they do to the others, so `.redact()` there is for API consistency, not a compliance requirement.

### Changed

- Depends on `@ts-typed/compiler@0.1.22` (the version this package's own dependency was pinned to had fallen behind the app-level direct dependency in a real install, creating two separate `ValueObject`/`StrictTypeError` class instances and silently breaking `@Catch(StrictTypeError)` matching — caught via a real end-to-end demo, same root cause documented in `@ts-typed/nestjs`'s own CHANGELOG history).

## [0.1.0] - 2026-10-18

### Added

- Initial release: six Brazilian document/data validators built on `@ts-typed/compiler`'s `ValueObject` (0.1.21) — `CPF`, `CNPJ` (both the legacy numeric format and the alphanumeric format in effect from July 2026, verified against the official Receita Federal test vector), `PIS` (with `Pasep`/`Nis`/`Nit` aliases — same number, same check digit, four government program names), `CEP`, `Placa` (legacy and Mercosul formats), and `CNH` (verified against the `Respect\Validation` PHP library's reference implementation). `RG` is deliberately not included — there is no nationally standardized check digit for it. `CEP` and `Placa` validate format only (neither has a check digit at all). Each class accepts either a formatted or bare input string, exposes `.numbers()` (normalized, unformatted) and, where a natural display format exists, `.masked()`.
