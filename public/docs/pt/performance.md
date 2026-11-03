# Performance e benchmarks

Os números abaixo são referências locais, não SLA. A bateria roda Node 22.22.3
com 7 amostras após 2 warmups, sempre comparando o mesmo fixture baseline
(`tsc`) e typed (`ts-typed build`).

| Cenário | Sem TS Typed | Com TS Typed | Impacto |
| --- | ---: | ---: | ---: |
| Express, 1 usuário | 0,811 ms | 0,650 ms | ruído local |
| Express, 50 usuários | 0,481 ms | 3,473 ms | 7,2x |
| Express, 10.000 usuários | 5,455 ms | 311,306 ms | 57,1x |
| Express, 10.000 + `TTOptImmut` | 5,455 ms | 198,085 ms | 1,57x melhor que typed normal |
| CSV, 1.000 linhas | 0,493 ms | 21,919 ms | 44,5x |
| CSV, 10.000 linhas | 3,758 ms | 201,496 ms | 53,6x |
| CSV, 50.000 linhas | 18,267 ms | 1.142,554 ms | 62,5x |

O Express remove `passwordHash` antes de responder e valida `Email`. O script
CSV faz parse, normaliza e rejeita e-mails inválidos. O resultado seguro sempre
é verificado para garantir que o campo secreto não voltou à resposta.

Esses números são de antes dos guards de mutação lazy descritos abaixo, mas
continuam representativos para esta bateria específica: todo cenário acima lê
todo campo de todo item antes de responder, e é exatamente esse o caso em que
os guards lazy **não** trazem ganho — veja [Guards de mutação lazy](#guards-de-mutacao-lazy)
para onde o ganho realmente aparece. Uma execução antes/depois no mesmo
ambiente do hot-path de CSV deste projeto (parse/transformação/remoção de
senhas, 500 linhas) confirmou que os dois são estatisticamente idênticos.

## Guards de mutação lazy

Instalar um guard de mutação num item de array ou numa propriedade de objeto
costumava significar envolver eagerly cada item/propriedade aninhado em um
`Proxy` no momento em que o valor cruzava uma fronteira tipada, lido ou não
depois. Os guards agora são instalados de forma lazy, no primeiro `get` de
cada slot, e memoizados para que uma leitura posterior do mesmo slot retorne
o mesmo proxy — um `set` continua validando e envolvendo de forma síncrona
exatamente como antes. Isso muda apenas *quando* a proteção de uma subárvore é
instalada, nunca se uma mutação real é detectada.

O ganho só aparece para uma subárvore que **não** é totalmente lida depois: um
antes/depois reproduzível na própria suíte de benchmarks do pacote
(`benchmarks/runtime-benchmark.cjs`, seção "Lazy mutation guards") mediu
453.770 ns/op para uma travessia de fronteira de um array de 200 itens nunca
lido depois, contra 858.901 ns/op para a mesma travessia seguida da leitura de
todos os itens — o custo da validação estrutural domina o caso totalmente
lido, então o ganho isolado da instalação do guard é real, mas estreito.

Um item de Set e uma chave de Map são a única exceção — a identidade deles
nunca pode ser trocada por um Proxy sem quebrar a ordem de iteração ou a busca
por chave — então eles mantêm o wrap eager anterior para seus próprios filhos
aninhados.

## Memoização de schema entre arquivos

Um tipo genérico usado em vários arquivos do mesmo build (por exemplo,
`Repository<User>` importado por vários services) é resolvido uma vez por
build, não uma vez por arquivo. O verificador do TypeScript reutiliza o mesmo
objeto de tipo subjacente para instanciações genéricas idênticas dentro de um
programa, e o resolvedor de schema já fazia cache por essa identidade —
confirmado com um teste de regressão dedicado; nenhuma mudança de código foi
necessária nessa parte.

## Como reproduzir

```bash
node benchmarks/exhaustive-battery.cjs
```

Para 10.000 entidades com TypeORM, Express e NestJS, use também o harness em
`benchmarks/performance`. Em produção, pagine antes de retornar milhares de
itens; o tamanho do lote é o maior multiplicador do custo.

## Como interpretar

`protectValue` mantém valores mutáveis seguros e paga por accessors e por
travessias repetidas. `TTOptImmut<T>` valida e congela POJOs novos; por isso é
mais rápido em DTOs de saída somente leitura, mas não serve para entities,
classes ou objetos com accessors. Em pipelines CSV, reduza cópias intermediárias,
use lotes/streaming e meça parse, validação e escrita separadamente.
