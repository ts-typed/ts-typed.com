# Genéricos

O TS Typed consegue validar valores que atravessam funções genéricas e classes genéricas. A ideia central é que o compilador precisa de um **tipo concreto** para montar um contrato em tempo de execução — e ele obtém esse tipo concreto diretamente do checker do TypeScript no ponto de chamada, seja o argumento de tipo escrito explicitamente ou deixado para o TypeScript inferir.

## Argumentos de tipo explícitos e inferidos

Chamar uma função genérica, ou construir uma classe genérica, valida tanto os argumentos quanto o resultado contra o tipo concreto daquela chamada — com um argumento de tipo explícito ou inferido:

```ts
interface Person {
  name: string;
  age: number;
}

function identity<T>(x: T): T {
  return x;
}

identity<Person>(valorComFormatoErrado); // lança StrictTypeError, validado contra Person
identity(valorComFormatoErrado);         // mesma verificação: T é inferido a partir do próprio argumento

class Box<T> {
  constructor(public readonly value: T) {}
}

new Box<Person>(valorComFormatoErrado); // o mesmo, para construtores
new Box(valorComFormatoErrado);         // e para uma chamada de construtor inferida
```

Em todos os casos, o valor é verificado contra `Person` na fronteira. Se não corresponder, um `StrictTypeError` é lançado antes que o valor chegue ao corpo da função ou aos campos do objeto.

O caso inferido não se limita a um tipo que vem do próprio argumento — também cobre um argumento de tipo guiado unicamente pelo tipo *esperado* no ponto de chamada, quando nenhum argumento o determina:

```ts
function response<T>(data: T): { data: T } {
  return { data } as { data: T };
}

const user: Person = { name: 'Ada', age: 36 };
const result = response(user); // T inferido como Person a partir de `user` — valida o formato completo { data: Person }
```

Isso funciona porque o `T` de `response(user)` é resolvido a partir do tipo já declarado de `user` — a mesma assinatura instanciada que um tooltip ao passar o mouse mostraria, sem precisar de `<Person>` explícito.

## Valores de retorno assíncronos

A mesma verificação se aplica ao valor resolvido de uma função assíncrona. Como o compilador faz a validação via `.then()`, a chamada continua retornando uma Promise, e uma verificação que falha rejeita essa Promise:

```ts
async function identityAsync<T>(x: T): Promise<T> {
  return x;
}

const person = await identityAsync<Person>(valorComFormatoErrado); // rejeita com StrictTypeError
```

## Parâmetros rest e argumentos com spread

Valores que caem em um parâmetro rest também são validados, inclusive os valores fornecidos pela sintaxe de spread:

```ts
function collect<T>(...items: T[]): T[] {
  return items;
}

collect<number>(1, 2, 'bad'); // lança StrictTypeError em 'bad'
collect(1, 2, 'bad');         // mesma verificação: o TypeScript já rejeitaria isso em tempo de compilação

const misturados: unknown[] = [1, 2, 'bad'];
collect<number>(...misturados); // a mesma verificação, aplicada aos valores do spread
```

## Quando a inferência não resolve para nada concreto

Se um parâmetro de tipo não é referenciado por nenhum argumento e não há um tipo esperado no ponto de chamada para guiá-lo, o TypeScript o resolve como `unknown`. O TS Typed trata isso da mesma forma que trata qualquer outro tipo não suportado: nenhum contrato é gerado para essa fronteira, em vez de validar contra o tipo errado.

## Um genérico nunca chamado ou construído

Uma classe ou método genérico usado apenas como anotação de tipo — nunca realmente chamado ou construído em lugar algum — não tem ponto de chamada para resolver uma assinatura instanciada, então este recurso não tem onde se apoiar. Quando esse parâmetro de tipo não resolvido tem uma restrição `extends` explícita (`T extends { id: number }`), ele agora é validado contra essa restrição — reportado como cobertura `"partial"` em vez de `"unsupported"`. Sem `extends` (uma restrição implícita `unknown`), ou quando a própria restrição não é suportada, ele continua totalmente desprotegido, igual a qualquer outro tipo não resolvido.

## O que ainda não é coberto

Geradores não são cobertos — chamar uma função geradora produz um iterador, e não um único valor de retorno, e os valores emitidos com `yield` não são validados.

Um método cuja declaração genérica vive em uma das bibliotecas embutidas do próprio TypeScript (`Array.prototype.map`, `Promise.resolve`, os métodos do próprio `Map`/`Set`, o `new Map(...)`/`new Set(...)` em si, e assim por diante) é deliberadamente excluído deste recurso. Instrumentar esses casos significaria adicionar validação em tempo de execução a praticamente toda operação de array/coleção de um projeto — bem fora do escopo de validar as funções e classes genéricas PRÓPRIAS de um projeto — e alguns deles (`Map`/`Set`) já têm tratamento dedicado em outro lugar (validação de entradas, [`compiler.enforceMutationGuards`](./configuration.md)).

Para a lista completa das fronteiras desta área, veja [Limitações](./limitations.md).
