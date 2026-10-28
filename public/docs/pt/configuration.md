# Configuração

O TS Typed lê suas configurações de um arquivo `typets.config.json` na raiz do projeto. Execute `npx ts-typed init` para gerar um arquivo com valores padrão razoáveis e, em seguida, ajuste apenas as chaves de que você precisa.

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

Todas as chaves são opcionais. O que você omitir assume o valor padrão indicado abaixo.

## Referência

A tabela a seguir lista todas as chaves de configuração, seus valores padrão e o que cada uma controla.

| Key | Default | Meaning |
|---|---|---|
| `entry` | `"src/main.ts"` | Ponto de entrada do projeto. |
| `tsconfig` | `"tsconfig.json"` | Configuração do TypeScript usada na compilação. |
| `outDir` | `"dist"` | Diretório de saída. |
| `integration` | `"typescript"` | Adaptador do framework (por exemplo, `"nestjs"`). |
| `allowExtraPropertiesAll` | `false` | Permite globalmente propriedades extras em todas as fronteiras de objetos (mesmo efeito de `AllowExtraProperties()` aplicado em todos os lugares). |
| `compiler.onUnsupported` | `"warn"` | `"warn"` ou `"error"` quando um tipo não pode receber um contrato em tempo de execução (por exemplo, um parâmetro de tipo genérico sem tipo concreto). |
| `compiler.strictClass` | `true` | Validação padrão nominal (`instanceof`) ou estrutural para valores tipados por classe. `instanceof` é embutido sempre que o compilador consegue alcançar a classe — mesmo arquivo, ou outro arquivo quando ela é importada lá pelo nome. Pode ser sobrescrita por classe com os decoradores `StrictClass()`/`StructuralClass()`. |
| `compiler.enforcePrivate` | `true` | Instrumenta os campos `private`/`protected` das classes. |
| `compiler.enforceReadonly` | `true` | Trava um campo `readonly` da classe após sua primeira atribuição validada (ignorado para campos `?`/`!`). |
| `compiler.enforceClosedInstances` | `false` | **Opt-in.** Sela uma instância de classe (`Object.preventExtensions`) assim que o construtor mais derivado termina. Nenhuma nova propriedade pode ser adicionada depois. |
| `compiler.enforceMutationGuards` | `false` | **Opt-in.** Envolve um array/Map/Set/objeto simples que cruza uma fronteira tipada em um Proxy que valida as mutações (push/splice/escrita por índice, `.set()`/`.add()`, delete/defineProperty, inclusive em contêineres aninhados), em vez de apenas verificar o valor uma vez na fronteira. |
| `compiler.sourceMap` | `true` | Gera source maps. |
| `diagnostics.format` | `"pretty"` | Saída de cobertura `"pretty"` ou `"json"`. |
| `diagnostics.coverage` | `"summary"` | `"summary"` ou `"detailed"`. |
| `diagnostics.reportFile` | `null` | Grava o relatório de cobertura em um arquivo, em vez de na saída padrão. |
| `ncc.*` | — | Opções de empacotamento repassadas ao `@vercel/ncc`: `enabled`, `minify`, `target`, `externals`, `cache`, `license`, `quiet`, `debugLog`. |

## Sobre as duas opções opt-in

Duas opções do compilador vêm **desligadas por padrão**: `compiler.enforceClosedInstances` e `compiler.enforceMutationGuards`. Elas não são experimentais nem estão incompletas. Estão desligadas porque cada uma entra em conflito com convenções que outras bibliotecas do ecossistema Node.js costumam adotar, por isso ligá-las é uma decisão que deve ser tomada com consciência.

### `enforceClosedInstances`

Selar uma instância de classe impede que qualquer propriedade seja adicionada depois que o construtor mais derivado termina. É uma garantia forte, mas conflita com um padrão muito comum em NestJS: `class-transformer` combinado com `ValidationPipe({ whitelist: true })`.

Esse pipeline copia primeiro todas as chaves do corpo da requisição para uma nova instância `new Dto()` e só depois remove as chaves que não estão na whitelist. Com o selamento ativo, essa primeira cópia lança erro já na primeira chave inesperada, antes de a etapa de whitelist ter chance de rodar.

Se você ativar esta opção, configure o `class-transformer` para que ele escreva apenas chaves declaradas desde o início. A abordagem usual é `excludeExtraneousValues: true` junto com `@Expose()` em cada propriedade que você aceita:

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

Esta opção envolve o valor que cruza uma fronteira tipada em um Proxy, de modo que todas as mutações posteriores (`push`, escrita por índice, `.set()`, `delete` e assim por diante) também sejam validadas. Essa proteção tem dois custos que você deve considerar:

- **Custo em tempo de execução.** Cada mutação executa uma verificação de validação, então caminhos críticos que modificam coleções grandes pagam esse custo a cada escrita.
- **Mudança de identidade.** O valor recebido é um Proxy, não a referência original. Comparações com `===` contra uma referência guardada antes da fronteira vão falhar, e uma referência bruta obtida antes da fronteira contorna a guarda por completo.

Ative a opção quando o custo for aceitável e a garantia valer mais para você do que a identidade do objeto.

> **A regra que governa tudo.** A configuração do TS Typed decide como o compilador se comporta, e o restante da sua stack precisa estar configurado para concordar com ela. Quando as duas coisas divergem, por exemplo uma configuração do `class-transformer` que escreve chaves não declaradas em uma instância selada, a divergência é um erro de configuração da aplicação, não um bug do TS Typed. Revise o restante da stack antes de reportar um problema.
