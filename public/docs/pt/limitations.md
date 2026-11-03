# Limitações

O TS Typed tem um escopo intencionalmente delimitado. As limitações abaixo são **fronteiras de escopo deliberadas, não descuidos**. Cada uma reflete uma escolha sobre o que o compilador promete e o que não promete, e esta página as lista de forma explícita para que você possa planejar em torno delas.

## Modelo de validação

- **Violações múltiplas não são agregadas por padrão.** Decorar uma classe com [`AggregateErrors()`](./decorators.md#aggregateerrors) faz ela coletá-las na fronteira de parâmetro, inclusive depois que o `class-transformer` preenche o DTO pelo `ValidationPipe({ transform: true })` do NestJS. Um DTO decorado aninhado também é drenado enquanto um objeto, array, tupla, `Map` ou `Set` que o contém é validado estruturalmente, portanto escritas rejeitadas não podem ser aceitas silenciosamente. A falha de construção de um campo `ValueObject` aninhado também é coletada no agregado, quando a flag de agregação se aplica — ela não lança mais imediatamente nem interrompe o resto das violações do DTO; fora da agregação, a construção continua lançando imediatamente, sem mudança. As fronteiras restantes são deliberadas: um **parâmetro** do tipo array (`dtos: Dto[]`) continua fail-fast após o primeiro elemento inválido; uma chamada de decorator qualificada por namespace não é detectada; e uma sobrescrita `TypeErrorResponse()` não entra nos campos herdados da primeira violação do agregado. Uma instância decorada que nunca cruza uma fronteira de parâmetro tipada mantém a janela de coleta aberta até o garbage collector fechá-la e reportar qualquer violação ainda bufferizada só via aviso de `console.error`, em vez de um throw; chame [`closeAggregateWindowOrThrow()`](./decorators.md#aggregateerrors) logo após o preenchimento manual (ex.: um `plainToInstance` fora de uma fronteira tipada) para fechar a janela explicitamente e lançar de forma síncrona.
- **Uma união genuinamente ambígua** (duas ou mais ramificações no formato de objeto, não-nulas) ainda reporta uma única violação `TYPE_MISMATCH`/`'union'` para esse campo, em vez de entrar em qualquer uma das ramificações — mas o campo `candidates` dessa violação agora lista por que cada ramificação foi rejeitada individualmente, em vez de deixar o motivo opaco.

## Coleções

- **`WeakMap` e `WeakSet` não são suportados no nível do schema.** Não se trata apenas de uma lacuna em tempo de execução: eles não podem ser iterados, então não há o que validar em uma passagem pela fronteira.
- **Os guards de mutação cobrem apenas o que envolvem.** Um guard envolve o valor que cruza a fronteira e seus contêineres aninhados no momento em que é criado, e de novo sempre que um novo valor é escrito por meio dele. Alguns caminhos contornam o guard:
  - Uma referência bruta obtida antes da fronteira.
  - Os itens já existentes de um Set. Eles não podem ser trocados sem alterar a ordem de iteração.

## Genéricos

- **Classes e métodos genéricos sem uso não são cobertos.** Chamadas e construções genéricas, inclusive com argumentos inferidos, são resolvidas no ponto de chamada. Mas um tipo genérico usado apenas como anotação, sem uma chamada ou construção concreta, não oferece ao compilador uma assinatura instanciada para transportar ao runtime. Quando esse parâmetro de tipo não resolvido tem uma restrição `extends` explícita (`T extends { id: number }`), ele agora é validado contra essa restrição — reportado como cobertura `"partial"` em vez de `"unsupported"`. Sem `extends` (uma restrição implícita `unknown`), ou quando a própria restrição não é suportada, ele continua totalmente desprotegido como antes.
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

## Notas de atualização

- **Desde o `@ts-typed/core` 0.7.0: o build falha num campo protegido "nu" sem `strictPropertyInitialization`.** Um campo de DTO declarado sem `?`, `!` ou inicializador (um campo "nu") depende do próprio `strictPropertyInitialization` do TypeScript para garantir que nunca fique sem valor — sem essa flag, a mesma escrita inválida podia antes ser reportada duas vezes (uma pela janela do campo, outra pela passagem estrutural). O build agora falha explicitamente, nomeando o(s) campo(s) afetado(s) (`arquivo:linha:coluna`), quando um campo protegido "nu" é compilado sem `strictPropertyInitialization` habilitado, em vez de deixar essa duplicação acontecer silenciosamente em tempo de execução. Se você encontrar isso depois de atualizar, habilite `"strictPropertyInitialization": true` (ou o guarda-chuva `"strict": true`) no seu `tsconfig`, ou dê ao campo um `?`, um `!` ou um inicializador inline.

---

Se alguma dessas limitações bloquear o seu caso de uso, o próximo passo geralmente é ajustar a fronteira: tornar o tipo explícito, importar a classe pelo nome ou manter uma etapa de validação própria onde o TS Typed não alcança. Para os mecanismos que cobrem essas áreas, veja [Decoradores](./decorators.md), [Genéricos](./generics.md), [Performance](./performance.md) e [Otimizações](./optimizations.md).
