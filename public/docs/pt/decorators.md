# Decoradores

O TS Typed oferece um pequeno conjunto de decoradores que ajustam a forma como o compilador valida uma classe ou uma propriedade. Todos são importados de `@ts-typed/core`:

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

Cada decorador sobrescreve um padrão para um único alvo. As configurações globais em `typets.config.json` continuam valendo para todo o resto.

### `AllowExtraProperties()`

`AllowExtraProperties()` é um decorador de classe ou de propriedade. Ele permite propriedades extras, não declaradas, na classe decorada ou no valor de uma propriedade decorada. É a sobrescrita, por alvo, da flag global `allowExtraPropertiesAll`.

```ts
@AllowExtraProperties()
class LooseConfig {
  public readonly host!: string;
  // Chaves adicionais são aceitas e mantidas.
}
```

Use-o em objetos que carregam dados extras de forma intencional, como blobs de configuração ou payloads de terceiros que você só aproveita em parte. Nos demais casos, mantenha o comportamento estrito padrão, para que chaves inesperadas sejam reportadas.

### `StrictClass()` / `StructuralClass()`

São decoradores de classe que controlam como valores tipados por classe são verificados em uma fronteira:

- **`StrictClass()`** força a validação **nominal**. Um valor só passa se for uma instância real da classe (`instanceof`).
- **`StructuralClass()`** força a validação **estrutural**. Um valor passa se seu formato corresponder à classe, independentemente da cadeia de protótipos.

Ambos sobrescrevem o padrão global `compiler.strictClass` apenas para aquela classe, qualquer que seja o padrão configurado. Subclasses herdam a configuração da classe pai, a menos que declarem a sua própria.

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

`ServerPopulated()` é um decorador de classe que marca uma classe cujas instâncias são preenchidas pelo servidor ou pelo banco de dados, e não pela entrada do cliente. O uso previsto é uma classe `@Entity()` do TypeORM.

Quando um campo de uma classe `ServerPopulated` falha na validação, o `StrictTypeError` carrega `isServerPopulated: true`. Essa flag nunca aparece em `toJSON()`. Ela é a metade do lado do compilador que permite distinguir um campo corrompido em uma Entity de uma entrada inválida em um DTO: um campo de Entity que falha indica um problema do lado do servidor, enquanto um campo de DTO que falha costuma ser culpa do cliente.

```ts
import { Entity } from 'typeorm';
import { ServerPopulated } from '@ts-typed/core';

@Entity({ name: 'todos' })
@ServerPopulated()
export class TodoEntity {
  // ...colunas e campos
}
```

No lado do NestJS, o `StrictTypeErrorFilter` do `@ts-typed/nestjs` lê essa flag e responde com HTTP `500` em vez de `400`, de modo que um problema interno de dados não seja reportado ao cliente como uma requisição inválida.

### `TypeErrorResponse(message, status?)`

`TypeErrorResponse` é um decorador de propriedade. Ele associa uma mensagem personalizada, voltada ao HTTP, e um código de status opcional a um campo específico:

```ts
import { TypeErrorResponse } from '@ts-typed/core';

export class CreateUserDto {
  @TypeErrorResponse('Invalid email', 422)
  public readonly email!: string;
}
```

Quando um `StrictTypeError` é lançado para esse campo, ele carrega `typeErrorResponseMessage` e `typeErrorResponseStatus`. Assim como a flag de `ServerPopulated`, essas propriedades nunca são incluídas em `toJSON()`.

Por si só, este pacote não tem nenhuma noção de HTTP. Quem transforma esses campos em uma resposta HTTP de fato são o `StrictTypeErrorFilter` e o `StrictTypeHttpError` do `@ts-typed/nestjs`. Pense no `TypeErrorResponse` como uma alternativa, por propriedade, às mensagens que você escreveria com class-validator.

**Importante:** o `TypeErrorResponse` continua sendo um mecanismo de falha rápida (fail-fast). Ele personaliza a resposta para a **única** violação que disparar naquela propriedade. Não é um agregado de todas as violações do objeto. Para isso, veja o `AggregateErrors()` abaixo.

### `AggregateErrors()`

`AggregateErrors()` é um decorador de classe. Ele faz a classe coletar **todas** as violações encontradas nela, em qualquer profundidade, em um único `AggregateStrictTypeError`, em vez do comportamento padrão fail-fast do TS Typed (só a primeira violação).

```ts
import { AggregateErrors, AggregateStrictTypeError } from '@ts-typed/core';

@AggregateErrors()
class CreateUserDto {
  public name: string = '';
  public age: number = 0;
}

function createUser(dto: CreateUserDto): void { /* ... */ }

try {
  createUser({ name: 42, age: 'velha' } as any);
} catch (error) {
  if (error instanceof AggregateStrictTypeError) {
    console.log(error.errors); // todas as violações, não só a primeira
  }
}
```

Isso tem escopo estreito, de propósito:

- **Só muda o comportamento na fronteira de parâmetro** — um argumento de função ou método, o formato que um corpo de requisição tem ao chegar num handler. Construção, escrita em campo depois da construção, variável e valor de retorno continuam fail-fast independente deste decorator. Não existe um "formulário inteiro" pra agregar numa escrita de campo único.
- **Percorre objetos e arrays aninhados em profundidade total**, incluindo um valor aninhado opcional ou anulável (`profile?: Profile`, `profile: Profile | null`) — desde que exatamente um ramo não-nulo do tipo daquele campo seja em formato de objeto ou array. Um campo cujo tipo tenha dois ou mais ramos em formato de objeto genuinamente ambíguos reporta uma violação genérica para aquele campo em vez disso.
- **A detecção é estática.** O compilador lê o decorator diretamente da declaração da classe, então funciona independente de qual arquivo declara a classe — o caso normal, já que um DTO quase sempre é importado do seu próprio arquivo.
- `AggregateStrictTypeError extends StrictTypeError`, então toda checagem `instanceof StrictTypeError` já existente — seu próprio `try`/`catch`, o `StrictTypeErrorFilter` do `@ts-typed/nestjs` — continua funcionando sem mudanças. Ela vê os campos da primeira violação através das propriedades herdadas, com a lista completa adicionalmente disponível em `.errors`.

`AggregateErrors()` também funciona com o `plainToInstance` do `class-transformer`, inclusive no `ValidationPipe({ transform: true })` do Nest. Um DTO decorado abre uma janela temporária de agregação após a construção: escritas inválidas enquanto o `plainToInstance` o preenche são coletadas, e a próxima fronteira de parâmetro tipada as une à validação estrutural completa. Isso também encontra campos obrigatórios ausentes e chaves não declaradas. Um DTO decorado aninhado é drenado quando o objeto, array, tupla, `Map` ou `Set` que o contém é validado estruturalmente; assim, uma escrita inválida não pode ser aceita silenciosamente por manter o valor padrão anterior.

Use o recurso em valores no papel de DTO, construídos e imediatamente passados por um parâmetro tipado. Uma instância decorada mutada indefinidamente sem cruzar essa fronteira mantém a janela aberta até ser coletada pelo garbage collector, momento em que qualquer violação ainda bufferizada só é reportada por um aviso via `console.error` (customizável com `setAggregateWindowLeakHandler`) — não lançada, já que não há mais um chamador para capturar nada, e sem previsibilidade de quando isso acontece, já que o timing do GC também não tem. Entrada bruta inválida para um campo `ValueObject` ainda lança imediatamente, em vez de entrar no agregado; veja [Limitações](./limitations.md).

Se você preenche uma instância decorada manualmente — o caso mais comum é um `plainToInstance` fora de uma fronteira de parâmetro tipada, como dentro de um `ValidationPipe` customizado antes do método do controller rodar — e nada jamais vai cruzar essa instância por um parâmetro tipado depois, chame `closeAggregateWindowOrThrow(instance)` logo após preenchê-la:

```ts
import { AggregateErrors, closeAggregateWindowOrThrow } from '@ts-typed/core';
import { plainToInstance } from 'class-transformer';

@AggregateErrors()
class CreateUserDto {
  public name: string = '';
  public age: number = 0;
}

const dto = plainToInstance(CreateUserDto, rawBody);
closeAggregateWindowOrThrow(dto); // lança AggregateStrictTypeError com todas as violações, de forma síncrona
```

Isso fecha a janela imediatamente e, se algo foi bufferizado, lança `AggregateStrictTypeError` com todas as violações coletadas ali mesmo — sem esperar o GC, sem o fallback de `console.error`, sem condição de corrida. É um no-op (não lança) quando a janela nunca esteve aberta, ou estava aberta mas vazia, então é seguro chamar defensivamente mesmo sem ter certeza se algo foi coletado.
