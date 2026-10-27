# Limitações

O TS Typed tem um escopo intencionalmente delimitado. As limitações abaixo são **fronteiras de escopo deliberadas, não descuidos**. Cada uma reflete uma escolha sobre o que o compilador promete e o que não promete, e esta página as lista de forma explícita para que você possa planejar em torno delas.

## Modelo de validação

- **Violações múltiplas não são agregadas por padrão.** Decorar uma classe com [`AggregateErrors()`](./decorators.md#aggregateerrors) faz ela coletá-las na fronteira de parâmetro, inclusive depois que o `class-transformer` preenche o DTO pelo `ValidationPipe({ transform: true })` do NestJS. Um DTO decorado aninhado também é drenado enquanto um objeto, array, tupla, `Map` ou `Set` que o contém é validado estruturalmente, portanto escritas rejeitadas não podem ser aceitas silenciosamente. As fronteiras restantes são deliberadas: um **parâmetro** do tipo array (`dtos: Dto[]`) continua fail-fast após o primeiro elemento inválido; uma chamada de decorator qualificada por namespace não é detectada; uma sobrescrita `TypeErrorResponse()` não entra nos campos herdados da primeira violação do agregado; e um campo `ValueObject` com entrada bruta inválida lança imediatamente em vez de entrar no agregado. Uma instância decorada que nunca cruza uma fronteira de parâmetro tipada mantém a janela de coleta aberta até o garbage collector fechá-la e reportar qualquer violação ainda bufferizada só via aviso de `console.error`, em vez de um throw; chame [`closeAggregateWindowOrThrow()`](./decorators.md#aggregateerrors) logo após o preenchimento manual (ex.: um `plainToInstance` fora de uma fronteira tipada) para fechar a janela explicitamente e lançar de forma síncrona.

## Coleções

- **`WeakMap` e `WeakSet` não são suportados no nível do schema.** Não se trata apenas de uma lacuna em tempo de execução: eles não podem ser iterados, então não há o que validar em uma passagem pela fronteira.
- **Os guards de mutação cobrem apenas o que envolvem.** Um guard envolve o valor que cruza a fronteira e seus contêineres aninhados no momento em que é criado, e de novo sempre que um novo valor é escrito por meio dele. Alguns caminhos contornam o guard:
  - Uma referência bruta obtida antes da fronteira.
  - Os itens já existentes de um Set. Eles não podem ser trocados sem alterar a ordem de iteração.

## Genéricos

- **Classes e métodos genéricos sem uso não são cobertos.** Chamadas e construções genéricas, inclusive com argumentos inferidos, são resolvidas no ponto de chamada. Mas um tipo genérico usado apenas como anotação, sem uma chamada ou construção concreta, não oferece ao compilador uma assinatura instanciada para transportar ao runtime.
- **Um método cuja declaração genérica vive em uma das bibliotecas embutidas do próprio TypeScript é excluído.** `Array.prototype.map`, `Promise.resolve`, os métodos do próprio `Map`/`Set`, o `new Map(...)`/`new Set(...)` em si, e assim por diante, estão deliberadamente fora do escopo — veja [Genéricos](./generics.md#o-que-ainda-não-é-coberto) para entender o motivo.
- **A delegação `yield*` não é validada pela função externa.** `yield` e o valor de retorno de generators/async generators são validados; a delegação é preservada sem reescrita. O generator delegado continua protegido se ele próprio tiver uma fronteira tipada.

## Saída de módulos

- **A saída AMD, UMD e System não é coberta pela guarda de `exports` do CommonJS.** A forma em lista `let x; export { x };` também não é coberta por essa guarda. O ESM não precisa de equivalente, porque os namespaces de módulo já são não graváveis por especificação.

## Detecção de `ValueObject`

- **Uma subclasse de `ValueObject` não é construída automaticamente quando é alcançada apenas por:**
  - inferência;
  - importação de namespace;
  - importação que não é nomeada explicitamente no arquivo que faz a resolução.
- **Uma união que inclui um tipo `ValueObject` não é construída automaticamente.** Por exemplo, `CPF | undefined` não é construído automaticamente.
- **Uma classe alcançada por uma instalação em `node_modules` via symlink ou workspace não é detectada.**

---

Se alguma dessas limitações bloquear o seu caso de uso, o próximo passo geralmente é ajustar a fronteira: tornar o tipo explícito, importar a classe pelo nome ou manter uma etapa de validação própria onde o TS Typed não alcança. Para os mecanismos que cobrem essas áreas, veja [Decoradores](./decorators.md), [Genéricos](./generics.md), [Performance](./performance.md) e [Otimizações](./optimizations.md).
