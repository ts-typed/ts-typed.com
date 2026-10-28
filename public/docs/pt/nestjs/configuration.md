# NestJS: configuração

O `init` cria a configuração base e a integração Nest resolve o `tsconfig` de acordo com `nest-cli.json` quando necessário:

```json
{
  "$schema": "./node_modules/@ts-typed/core/schema.json",
  "integration": "@ts-typed/nestjs",
  "entry": "src/main.ts",
  "tsconfig": "tsconfig.build.json",
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
  "ncc": { "enabled": false },
  "diagnostics": { "format": "pretty", "coverage": "summary", "reportFile": null }
}
```

Nest compila sem NCC para preservar o fluxo normal `dist/main.js`; mesmo que `ncc.enabled` esteja no arquivo, os comandos Nest o desabilitam. `entry`, `tsconfig`, `outDir`, `assets`, `extends` e diagnósticos seguem a mesma semântica do compilador. `assets` copia `{ from, to }` para dentro de `outDir`.

`compiler.strictClass` agora é `true` por padrão. Para DTOs de `@Body()`, defina `strictClass: false` como no exemplo acima, pois o input comum é objeto JSON estrutural (a menos que você use `class-transformer`/`plainToInstance` para materializar uma instância real antes da fronteira); `@StructuralClass()` cobre exceções por DTO. Mantenha `allowExtraPropertiesAll: false` e abra somente DTO/campo que precisa de extensão. `enforcePrivate` e `enforceReadonly` protegem estado de classe; `onUnsupported` deve virar `error` no CI depois da adoção.

Não ative `enforceClosedInstances` junto de `ValidationPipe({ whitelist: true })` sem mudar o `class-transformer`: o padrão copia chaves e só depois as remove; uma instância fechada falha na cópia. Para esse rigor, use transformação que escreva apenas campos declarados, por exemplo `excludeExtraneousValues: true` com `@Expose()`. `enforceMutationGuards` usa `Proxy` e deve ser uma decisão medida por fluxo. Consulte [Configuração TypeScript](../typescript/configuration.md) para todas as opções.
