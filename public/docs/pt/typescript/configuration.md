# TypeScript: configuração

`typets.config.json` define como o projeto é lido, instrumentado e emitido. O schema em `./node_modules/@ts-typed/core/schema.json` rejeita chaves desconhecidas; isso evita uma opção escrita errado parecer funcionar.

## Base recomendada

```json
{
  "$schema": "./node_modules/@ts-typed/core/schema.json",
  "integration": "typescript",
  "entry": "src/main.ts",
  "tsconfig": "tsconfig.json",
  "outDir": "dist",
  "allowExtraPropertiesAll": false,
  "compiler": {
    "sourceMap": true,
    "onUnsupported": "warn",
    "strictClass": true,
    "enforcePrivate": true,
    "enforceReadonly": true,
    "enforceClosedInstances": false,
    "enforceMutationGuards": false
  },
  "ncc": { "enabled": true, "sourceMap": true, "target": "es2020" },
  "diagnostics": { "format": "pretty", "coverage": "summary", "reportFile": null }
}
```

`extends` aceita outro arquivo, resolvido a partir do arquivo que o declara, ou `null`. Use-o para diferenças de ambiente em vez de duplicar a configuração.

## Projeto e entrada

| Opção | Padrão | Recomendação |
| --- | --- | --- |
| `entry` | `src/main.ts` | Aponte para o bootstrap que o `start` executa. |
| `tsconfig` | `tsconfig.json` | Use `tsconfig.build.json` se ele é a fonte da compilação de produção. |
| `outDir` | `dist` | Alinhe ao diretório executado no deploy. |
| `integration` | `typescript` | Não altere em TypeScript puro. |
| `assets` | `[]` | Copie arquivos de runtime com `{ "from": "src/templates/**/*.html", "to": "templates" }`; `to` é relativo a `outDir`. |
| `allowExtraPropertiesAll` | `false` | Mantenha fechado globalmente; prefira `@AllowExtraProperties()` no DTO que é extensível. |

## `compiler`

`sourceMap` começa em `true`. Mantenha-o em desenvolvimento; em produção, confirme a política de publicação de fonte. Se ele for `false`, `ncc.sourceMap` também deve ser `false`.

`onUnsupported` é `warn` ou `error`. Comece com `warn` para descobrir contratos sem representação de runtime; depois use `error` no CI para não publicar uma fronteira que você imaginava protegida.

`strictClass` agora é `true` por padrão: o compilador exige `instanceof` sempre que consegue alcançar a classe com uma referência viva — mesmo arquivo, ou outro arquivo quando a classe é importada lá pelo nome. Para DTOs JSON que chegam como objeto simples (ex.: `@Body()` do Nest, `express.json()`), defina `strictClass: false` globalmente ou decore o DTO com `@StructuralClass()`; reserve o `true` para objetos de domínio que só surgem por construção controlada. Prefira `@StrictClass()`/`@StructuralClass()` para exceções locais ao padrão global.

`enforcePrivate: true` converte `private`/`protected` em privacidade real. Acesso por colchetes a um desses campos impede o build. `enforceReadonly: true` bloqueia uma segunda escrita em `readonly`; campos com `?` ou `!` permanecem preenchíveis depois da construção para compatibilidade com mapeadores.

`enforceClosedInstances` é opt-in porque chama `Object.preventExtensions` após o construtor. É bom para domínio fechado, mas quebra bibliotecas que copiam todo payload antes de retirar chaves extras. `enforceMutationGuards` também é opt-in: instala `Proxy` em arrays, `Map`, `Set` e objetos simples que cruzam fronteira para validar mutações posteriores. Há custo por mutação e a referência passa a ser um proxy, então habilite somente após medir o fluxo.

## `ncc` e diagnósticos

Em TypeScript puro, `ncc.enabled` é `true`: útil para CLIs e serviços que publicam um artefato Node. As opções são `minify`, `sourceMap`, `sourceMapRegister`, `target`, `externals`, `cache`, `license`, `quiet` e `debugLog`. Desligue `enabled` se o seu deploy já empacota módulos, depende de carregamento dinâmico ou precisa de arquivos separados. Use `externals` para dependências que devem continuar fora do bundle.

`diagnostics.format` aceita `pretty` ou `json`; `coverage` aceita `summary` ou `detailed`; `reportFile` grava o manifesto de cobertura ou recebe `null`. Essa cobertura descreve contratos instrumentados, não testes executados.

Comece com os padrões, trate avisos e só então imponha `onUnsupported: "error"`. Leia [Limitações conhecidas](../limitations.md) antes de assumir que um tipo aberto ou `WeakMap` é validado integralmente.
