# Conceitos Centrais

O TS Typed é construído em torno de uma ideia: um valor é verificado no ponto em que atravessa um **typed boundary**, contra o tipo declarado naquele exato lugar. Esta página explica essa ideia, o que é verificado e como as violações são reportadas.

## Typed boundaries

Um typed boundary é um ponto do código em que um valor entra em um tipo declarado. O compilador encontra todos eles no seu projeto usando o verificador de tipos do TypeScript:

- **Declarações de variáveis**, como `const user: User = input;`
- **Parâmetros de função**, quando um chamador passa um argumento
- **Instruções `return`**, quando uma função produz um valor
- **Atribuições a campos de classe**
- **Casts**, como `value as User`
- **Expressões `satisfies`**

Em cada boundary, o compilador insere uma verificação em tempo de execução construída a partir do tipo declarado naquele ponto. Você não escreve essas verificações e não mantém um schema separado para elas.

```ts
export function greet(user: { name: string; age: number }): string {
  return `Olá, ${user.name}`;
}
```

O parâmetro `user` é um typed boundary. Chamadas que passam um valor com a forma errada falham no ponto de entrada, antes que o corpo da função seja executado.

## O que é verificado

As verificações em tempo de execução cobrem os tipos que você já usa:

- **Primitivos e literais**: `string`, `number`, `boolean`, `bigint`, `symbol` e tipos literais. `null` e `undefined` são distinguidos corretamente. `NaN` e `Infinity` são aceitos como números comuns, sem nenhuma verificação de domínio — a menos que o campo seja tipado com [`Int`/`Float`/`Str`](#valores-com-intervalo-int-float-str), que rejeita esses valores e aplica seu próprio limite mínimo/máximo.
- **Uniões, interseções e tuplas**, incluindo template literal types.
- **Objetos são fechados por padrão.** Um objeto com uma propriedade extra e não declarada falha com `EXTRA_PROPERTY`. Isso é mais rigoroso do que o TypeScript puro, que aceita propriedades extras em muitas posições. Para desativar essa regra, use o decorator `AllowExtraProperties()` em uma classe ou defina a flag de configuração `allowExtraPropertiesAll`.
- **Datas.** `Date` é validada como uma instância real de `Date`, e não como qualquer objeto.
- **Tipos branded.** Um tipo como `type UserId = string & { __brand: 'UserId' }` é aceito no primitivo subjacente.
- **Classes.**
  - Campos `private` e `protected` são verificados quando `compiler.enforcePrivate` está ativo.
  - Campos `readonly` são verificados quando `compiler.enforceReadonly` está ativo. Campos declarados com `?` ou `!` são ignorados, para que bibliotecas como o `class-transformer` possam preenchê-los depois da construção.
  - Campos obrigatórios são travados como não configuráveis, a partir do construtor mais derivado.
  - Campos `static` são verificados.
- **Desestruturação.** Em `const { age }: Profile = value;`, o valor de origem inteiro é validado antes de qualquer binding ser extraído.
- **Type guards e funções de asserção.** Uma função `x is T` definida pelo usuário valida o alvo quando retorna `true`. Uma função `asserts x is T` valida em todos os caminhos normais de retorno.
- **`Map`, `Set`, `ReadonlyMap` e `ReadonlySet`.** As entradas são validadas contra os tipos declarados de chave, valor e item. `WeakMap` e `WeakSet` não são suportados, porque o conteúdo não pode ser iterado.
- **Generators, `async`/`await` e chamadas e construtores com generics explícitos.**
- **Bindings de módulos CommonJS.** Um `let` ou `var` exportado é protegido no próprio objeto `exports`.

## Valores com intervalo: `Int`, `Float`, `Str`

`Int`, `Float` e `Str` colocam uma restrição de mínimo/máximo diretamente no tipo, sem precisar de decorator nem de uma classe validadora:

```ts
import type { Int, Float, Str } from '@ts-typed/core';

class SignupDto {
  age: Int<0, 150>;     // inteiro, 0..150
  rating: Float<0, 5>;  // qualquer número finito, 0..5
  nickname: Str<1, 20>; // string, comprimento 1..20
}
```

- `Min`/`Max` (`MinLen`/`MaxLen` para `Str`) são cada um **independentemente opcional** — omita um deles para verificar só o outro:
  ```ts
  type Count = Int<0>;          // >= 0, sem limite superior
  type Page = Int<number, 100>; // <= 100, sem limite inferior
  ```
- `Int` exige um inteiro (`Number.isInteger`); `Float` aceita qualquer número finito. Ambos rejeitam `NaN` e `±Infinity`, independentemente dos limites.
- Envolver o tipo em um alias próprio preserva a restrição: `type Age = Int<0, 150>;` se comporta exatamente como usar `Int<0, 150>` diretamente.
- Uma violação é reportada do mesmo jeito que qualquer outra divergência: `StrictTypeError` com `code: 'TYPE_MISMATCH'` e um `expected` descrevendo o limite que falhou (ex.: `"integer >= 0 and <= 150"`).
- `Min` maior que `Max` (ex.: `Int<150, 0>`) é um erro de quem escreveu o código, não uma limitação do sistema de tipos: é reportado pela mesma via `compiler.onUnsupported` de qualquer outro contrato sem suporte (`"warn"` por padrão, `"error"` falha o build — veja [Configuração](./configuration.md)).
- Como `Int`/`Float`/`Str` são tipos TypeScript comuns (branded), passar o mouse sobre um campo tipado com um deles no editor mostra a restrição (`Int<0, 150>`), não só `number` — não há nada para configurar nisso, é consequência de como o tipo é declarado.
- Isso complementa os validadores baseados em `ValueObject` do [`@ts-typed/validators`](./validators.md) (`CPF`, `Email`, ...), sem substituí-los: use `Int`/`Float`/`Str` para um limite simples sobre um primitivo, e `ValueObject` quando o valor precisa de identidade/métodos próprios (formatação, máscara, verificações específicas do domínio).

## Erros: `StrictTypeError`

Toda violação lança um `StrictTypeError`. Ele é uma subclasse de `TypeError`, então o tratamento existente com `instanceof TypeError` continua funcionando.

```ts
class StrictTypeError extends TypeError {
  code: 'TYPE_MISMATCH' | 'EXTRA_PROPERTY' | 'REQUIRED_PROPERTY' | 'READONLY_PROPERTY' | 'INVALID_MUTATION';
  propertyPath: string;   // ex.: "CreateUserDto.email"
  expected: string;
  received: string;
  contractKind: 'variable' | 'parameter' | 'property' | 'return' | ...;
  operation: string;      // ex.: "initialize" | "set" | "argument" | "return" | "mutate"
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

Cada campo informa algo específico sobre a falha:

- **`code`** classifica a violação:
  - `TYPE_MISMATCH`: o valor tem o tipo errado.
  - `EXTRA_PROPERTY`: o objeto tem uma propriedade que o tipo não declara.
  - `REQUIRED_PROPERTY`: uma propriedade obrigatória está ausente.
  - `READONLY_PROPERTY`: um campo `readonly` foi alterado depois de inicializado.
  - `INVALID_MUTATION`: um valor foi alterado de um modo que o tipo declarado não permite.
- **`propertyPath`** aponta o local da falha, como `CreateUserDto.email`.
- **`expected`** e **`received`** descrevem o tipo declarado e a forma observada.
- **`contractKind`** indica qual tipo de boundary falhou, como variável, parâmetro, propriedade ou valor de retorno.
- **`operation`** indica o que o runtime estava fazendo, como `initialize`, `set`, `argument`, `return` ou `mutate`.
- **`className`** e **`functionName`** identificam a classe ou função envolvente, quando aplicável.

### Seguro para registrar

O `toJSON()` retorna os campos acima e nada além disso. Ele nunca inclui o valor bruto que falhou na validação, e nunca inclui um stack trace. Você pode registrar ou serializar o erro sem vazar a entrada rejeitada.

```ts
try {
  createUser(payload);
} catch (error) {
  if (error instanceof StrictTypeError) {
    logger.warn(error.toJSON());
  }
}
```

## Comportamento fail-fast

O TS Typed é fail-fast. A primeira violação encontrada lança o erro imediatamente. Ele não percorre o objeto inteiro para reunir todos os problemas em um único erro agregado, como fazem algumas bibliotecas de validação.

Considere esta entrada:

```ts
class CreateUserDto {
  public name!: string;
  public age!: number;
  public email!: string;
}

createUser({ name: 42, age: 'trinta', email: 'ana@example.com' });
```

A verificação reporta a primeira divergência que encontra, por exemplo `name`, e lança o erro. Ela não reporta também `age`. Depois que você corrige `name`, a próxima requisição pode revelar `age`.

Isso mantém o caminho de falha simples e barato. O erro descreve um problema concreto, e o código que o trata nunca precisa interpretar uma lista de problemas.

Se você precisar de todas as violações reportadas juntas — no modelo do class-validator —, decore a classe com `AggregateErrors()` e o TS Typed vai coletar todas as violações encontradas em um valor que cruza uma fronteira de parâmetro, em vez de parar na primeira. É opt-in e tem escopo estreito; veja [`AggregateErrors()`](./decorators.md#aggregateerrors) pra entender exatamente onde ele se aplica e onde não.
