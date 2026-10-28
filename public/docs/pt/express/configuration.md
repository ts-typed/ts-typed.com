# Express: configuração

A configuração é o mesmo `typets.config.json` do compilador, com `integration` apontando para a integração Express:

```json
{
  "$schema": "./node_modules/@ts-typed/core/schema.json",
  "integration": "@ts-typed/express",
  "entry": "src/main.ts",
  "tsconfig": "tsconfig.json",
  "outDir": "dist",
  "allowExtraPropertiesAll": false,
  "compiler": {
    "sourceMap": true,
    "onUnsupported": "warn",
    "strictClass": false,
    "enforcePrivate": true,
    "enforceReadonly": true,
    "enforceClosedInstances": false,
    "enforceMutationGuards": false
  },
  "ncc": { "enabled": true, "sourceMap": true, "target": "es2020" },
  "diagnostics": { "format": "pretty", "coverage": "summary", "reportFile": null }
}
```

`entry` precisa ser o arquivo que cria a app Express; o instalador do handler lê essa mesma chave (padrão `src/main.ts`). `tsconfig`, `outDir`, `assets` e `extends` têm o mesmo significado do TypeScript puro. `assets` recebe pares `{ from, to }`, com destino relativo ao `outDir`.

Para APIs JSON, mantenha `allowExtraPropertiesAll: false`: uma chave desconhecida em DTO é rejeitada em vez de atravessar o serviço. Use `@AllowExtraProperties()` só em payloads extensíveis conhecidos. `compiler.strictClass` agora é `true` por padrão; como entradas de `express.json()` chegam como objeto simples (não instâncias reais), defina `strictClass: false` para request bodies, como no exemplo acima, ou decore o DTO com `@StructuralClass()`.

Mantenha `enforceClosedInstances` desligado até validar seus mapeadores, e `enforceMutationGuards` desligado até medir: ele usa `Proxy` e altera a identidade de valores que cruzam a fronteira. `onUnsupported: "warn"` facilita a adoção; promova para `"error"` no CI depois de tratar avisos.

`ncc.enabled` é útil para um deploy Node autocontido. Desligue-o se a plataforma já cria o bundle ou precisa de `require` dinâmico; use `externals` para módulos que devem ficar fora. `diagnostics.format` é `pretty`/`json`, `coverage` é `summary`/`detailed` e `reportFile` persiste o manifesto. Consulte a [configuração TypeScript](../typescript/configuration.md) para a referência completa de cada flag.
