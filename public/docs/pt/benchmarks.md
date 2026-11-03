# Benchmarks

Estas medições mostram o custo dos contratos em runtime nos projetos de referência. Elas são orientação, não promessa para toda CPU, versão do Node.js, driver, payload ou rede.

## Método

Os cenários HTTP usam Node 22.22.3, TypeORM 0.3.28, better-sqlite3 12.11.1, servidores reais de Express e Nest, cinco amostras de 20 requests e concorrência 4. Os cenários internos rodam em memória. Baseline não usa runtime do TS Typed; os caminhos typed validam a resposta. Os valores são milissegundos estimados por request.

## Resultados representativos

| Cenário | Baseline | TS Typed imutável | Proteção mutável |
| --- | ---: | ---: | ---: |
| Express, 50 usuários | 1,193 ms | 1,395 ms | 2,120 ms |
| Express, 10.000 usuários | 52,15 ms | 124,75 ms | 245,13 ms |
| NestJS, 50 usuários | 1,030 ms | 1,380 ms | 2,160 ms |
| NestJS, 10.000 usuários | 55,61 ms | 124,22 ms | 249,76 ms |

O caminho imutável usa `TTOptImmut`: valida o grafo uma vez e congela o POJO resultante. O caminho mutável instala proteção em cada objeto. A diferença cresce com a quantidade de objetos; paginação e projeções públicas normalmente importam mais que micro-otimizações do guard.

## Como interpretar

- Em respostas pequenas, socket e JSON podem dominar; uma diferença pequena é ruído.
- Em respostas grandes, o custo de percorrer e proteger objetos se multiplica.
- Selecione colunas públicas e mapeie entidades para DTOs antes da fronteira. Nunca retorne segredos para removê-los depois.
- Reexecute o benchmark com seu schema e hardware antes de definir um orçamento de latência.

O código e os comandos exatos ficam no repositório. Comandos dependentes da CLI exigem revisão factual final; esta página não inventa flags do compilador.

Esses números são de antes dos guards de mutação lazy, cobertos em [Performance](./performance.md#guards-de-mutação-lazy). Uma resposta HTTP totalmente serializada lê todo campo de qualquer forma, então não se espera que a coluna "Proteção mutável" acima mude muito com essa mudança — o ganho medido é específico de uma subárvore que cruza uma fronteira mas nunca é totalmente lida depois.
