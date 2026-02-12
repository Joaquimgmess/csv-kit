# csv-kit — Design Document

Lib isomorfica (browser + Node) para parse e geração de CSV, zero dependências.

Criada para substituir `papaparse` e `csv-parse` no Licitei, mas genérica o suficiente para qualquer projeto.

## Motivação

O Licitei usa duas libs diferentes para CSV:

- **papaparse** (browser) — parse de CSV em upload de itens de licitação
- **csv-parse** (server) — parse de CSV do Portal de Compras Públicas
- **Utilitário manual** (`pcp-csv.ts`) — geração de CSV com string concatenation

Problemas:
- Duas dependências para o mesmo propósito
- A geração de CSV é manual e frágil (sem escape correto em todos os edge cases)
- `csv-parse` é Node-only, `papaparse` tem API verbosa

## Princípios

1. **Isomórfica** — manipulação pura de strings, sem APIs específicas de runtime
2. **Zero dependências**
3. **API mínima** — duas funções: `parse` e `generate`
4. **Defaults sensatos** — funciona sem configuração em 90% dos casos
5. **RFC 4180 compliant** — com modo relaxado para CSVs mal-formados do mundo real
6. **TypeScript-first** — tipagem genérica, inferência de tipos

## Conformidade com RFC 4180

Referência: [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180.html)

Regras implementadas:

1. Cada registro em uma linha separada, delimitada por line break (CRLF)
2. Último registro pode ou não ter line break
3. Primeira linha pode ser header
4. Campos separados por delimitador (vírgula por padrão)
5. Campos podem ser envoltos em aspas duplas
6. Campos com line breaks, aspas ou delimitador DEVEM ser envoltos em aspas
7. Aspas dentro de campo escapadas com aspas duplas (`""`)

Extensões além do RFC (modo `relaxed`):
- Tolerância a aspas malformadas (não fechadas)
- Tolerância a contagem inconsistente de colunas
- Suporte a delimitadores além de vírgula (`;`, `\t`, `|`)

## API

### `parse`

Converte uma string CSV em array de objetos tipados ou array de arrays.

```ts
import { parse } from "csv-kit"

// header: true (default) — retorna objetos tipados
const rows = parse<{ nome: string; valor: string }>(csvString)

// header: false — retorna array de arrays
const raw = parse(csvString, { header: false })
// raw: string[][]
```

#### Overloads de tipo

```ts
function parse<T = Record<string, string>>(csv: string, options?: ParseOptions & { header?: true }): T[]
function parse(csv: string, options: ParseOptions & { header: false }): string[][]
```

Quando `header: true` (default), o retorno é `T[]`. Quando `header: false`, o retorno é `string[][]` — sem necessidade de generic.

#### ParseOptions

| Opção | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `header` | `boolean` | `true` | Primeira linha como chaves dos objetos |
| `delimiter` | `string \| "auto"` | `"auto"` | Delimitador. `"auto"` detecta entre `,` `;` `\t` `\|` |
| `skipEmptyLines` | `boolean` | `true` | Pular linhas vazias |
| `trim` | `boolean` | `true` | Trim em cada valor |
| `transformHeader` | `(header: string, index: number) => string` | `undefined` | Transformar nomes dos headers |
| `relaxed` | `boolean` | `false` | Tolerar quotes malformadas e colunas inconsistentes |

#### Tratamento de erros

No modo **strict** (default, `relaxed: false`), o `parse` faz throw com mensagens descritivas:
- `"csv-kit: row 3 has 3 fields, expected 5"` — colunas inconsistentes
- `"csv-kit: unclosed quote at row 2"` — aspas não fechadas
- Input não-string (`null`, `undefined`, `number`) sempre faz throw, independente do modo

No modo **relaxed** (`relaxed: true`), nunca faz throw:
- Colunas faltantes são preenchidas com `""`
- Aspas não fechadas são tratadas como texto literal
- Colunas extras são preservadas

#### Auto-detect de delimitador

Algoritmo: contar ocorrências de cada candidato (`,`, `;`, `\t`, `|`) nas **10 primeiras linhas** (fora de campos entre aspas). O delimitador com contagem mais consistente entre linhas vence. Em caso de empate, prioridade na ordem listada. Analisar apenas a primeira linha é frágil — headers podem ter poucos campos ou um campo só.

### `generate<T>(data: T[], options?: GenerateOptions): string`

Converte array de objetos em string CSV.

```ts
import { generate } from "csv-kit"

const csv = generate(rows, { delimiter: ";", columns: ["nome", "valor"] })
```

#### GenerateOptions

| Opção | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `header` | `boolean` | `true` | Incluir linha de header |
| `delimiter` | `string` | `","` | Delimitador de campo |
| `columns` | `string[] \| Record<string, string>` | `undefined` | Quais colunas incluir e em que ordem. `string[]` usa as keys como headers. `Record` mapeia key do objeto → header no CSV. `undefined` = todas (extraídas do primeiro objeto) |
| `newline` | `string` | `"\n"` | Caractere de quebra de linha |
| `bom` | `boolean` | `false` | Prefixar BOM UTF-8 (`\uFEFF`) na saída. Necessário para Excel no Windows abrir o CSV com encoding correto |

Exemplo de `columns` com rename:

```ts
generate(items, {
  delimiter: ";",
  columns: {
    processNumber: "Número do Processo",
    item: "Item",
    value: "Valor Unitário",
  }
})
```

#### Conversão de valores

Todos os valores são convertidos para string com `String(value)`. Casos especiais:
- `null` e `undefined` → `""` (string vazia)
- `number`, `boolean`, etc → `String(value)` (ex: `1500.50` → `"1500.50"`, `true` → `"true"`)

A responsabilidade de formatar dados (ex: datas, moedas) é do caller, não da lib.

#### Escape automático

Valores são automaticamente envoltos em aspas quando contêm:
- O delimitador
- Aspas duplas (escapadas como `""`)
- Line breaks (`\n` ou `\r`)

## Estrutura do Projeto

```
csv-kit/
├── src/
│   ├── index.ts          # re-exporta parse e generate
│   ├── parse.ts          # função parse + tipos ParseOptions
│   ├── generate.ts       # função generate + tipos GenerateOptions
│   └── utils.ts          # detectDelimiter, escapeField, splitLines
├── tests/
│   ├── parse.test.ts     # testes de parse
│   └── generate.test.ts  # testes de generate
├── package.json
├── tsconfig.json
└── README.md
```

## Setup do Projeto

- **Runtime**: Bun
- **Build**: `bun build` — gera ESM + CJS (dual package via `exports`)
- **Testes**: `bun test`
- **Publicação**: npm

### package.json (estrutura)

```json
{
  "name": "csv-kit",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "bun run build.ts",
    "test": "bun test"
  }
}
```

## Implementação — Detalhes Internos

### utils.ts

#### `detectDelimiter(lines: string[]): string`

Recebe as 10 primeiras linhas. Conta ocorrências de `,` `;` `\t` `|` em cada linha (fora de campos entre aspas). Retorna o delimitador com contagem mais consistente entre linhas. Em caso de empate, prioridade: `,` > `;` > `\t` > `|`.

#### `splitLines(csv: string): string[]`

Faz split respeitando line breaks dentro de campos entre aspas. Suporta `\r\n`, `\r` e `\n`.

#### `splitFields(line: string, delimiter: string, relaxed: boolean): string[]`

Faz split de uma linha em campos, respeitando aspas. No modo `relaxed`, aspas não fechadas são tratadas como texto literal.

#### `escapeField(value: string, delimiter: string): string`

Envolve o valor em aspas se necessário (contém delimitador, aspas, ou line break). Escapa aspas internas com `""`.

### parse.ts

1. Validar input — se não é string, throw `"csv-kit: input must be a string"`
2. Remover BOM UTF-8 (`\uFEFF`) do início se presente
3. Normalizar line endings para `\n`
4. Fazer `splitLines` respeitando campos entre aspas
5. Se `skipEmptyLines`, filtrar linhas vazias
6. Se `delimiter` é `"auto"`, detectar com `detectDelimiter` usando as 10 primeiras linhas
7. Primeira linha como headers (se `header: true`), aplicar `transformHeader`
8. Para cada linha restante, `splitFields` e mapear para objeto
9. Se `trim`, aplicar trim em cada valor
10. Se linha tem menos campos que headers:
    - `relaxed: true` → preencher com `""`
    - `relaxed: false` → throw com mensagem descritiva (linha e contagem)
11. Se aspas não fechadas:
    - `relaxed: true` → tratar como texto literal
    - `relaxed: false` → throw com mensagem descritiva (linha)

### generate.ts

1. Determinar colunas e headers:
   - `columns` é `string[]` → keys = values = array
   - `columns` é `Record<string, string>` → keys = `Object.keys()`, headers = `Object.values()`
   - `columns` é `undefined` → keys e headers de `Object.keys(data[0])`
2. Se `bom: true`, prefixar `\uFEFF`
3. Se `header: true`, gerar linha de header (usando headers, não keys)
4. Para cada objeto, extrair valores na ordem das keys
5. Converter valores: `null/undefined → ""`, resto → `String(value)`
6. Aplicar `escapeField` em cada valor
7. Juntar com delimitador e newline

## Casos de Teste

### parse

- CSV simples com vírgula
- CSV com ponto-e-vírgula (padrão brasileiro)
- Auto-detect de delimitador com 10 linhas
- Auto-detect com header de campo único (não deve chutar errado)
- Campos entre aspas com vírgulas dentro
- Campos entre aspas com aspas internas (`""`)
- Campos com line breaks dentro de aspas
- Linhas vazias no meio do arquivo
- Header com transformação (lowercase, snake_case)
- `header: false` retornando `string[][]` (tipo correto via overload)
- Modo `relaxed`: aspas não fechadas → texto literal
- Modo `relaxed`: linhas com número inconsistente de colunas → preenchido com `""`
- Modo strict: aspas não fechadas → throw com mensagem descritiva
- Modo strict: colunas inconsistentes → throw com mensagem descritiva
- Input não-string → throw `"csv-kit: input must be a string"`
- Trim em valores com espaços
- CSV vazio retorna `[]`
- CSV com apenas header retorna `[]`
- BOM UTF-8 no início do arquivo é removido automaticamente

### generate

- Array de objetos simples
- Delimitador customizado (`;`)
- Subset de colunas com `columns` (string[])
- Rename de headers com `columns` (Record<string, string>)
- Valores com vírgula são envoltos em aspas
- Valores com aspas são escapados com `""`
- Valores com line breaks são envoltos em aspas
- `header: false` omite linha de header
- Array vazio retorna `""` (ou só o header se `header: true`)
- Valores `null` e `undefined` viram string vazia
- Valores `number`, `boolean` viram `String(value)`
- `bom: true` prefixa `\uFEFF` na saída
- `bom: false` (default) não prefixa nada

## Mapeamento — Substituição no Licitei

### papaparse → csv-kit (items-table.tsx)

```ts
// Antes
const parseResult = Papa.parse<CsvRecord>(csvData, {
  header: true,
  skipEmptyLines: true,
  delimitersToGuess: [",", ";"],
  transformHeader: (header) =>
    header.trim().toLowerCase().replace(/\s+/g, "_").replace(/\./g, ""),
})
const rows = parseResult.data

// Depois
const rows = parse<CsvRecord>(csvData, {
  transformHeader: (header) =>
    header.trim().toLowerCase().replace(/\s+/g, "_").replace(/\./g, ""),
})
```

Os defaults de csv-kit (`header: true`, `skipEmptyLines: true`, `delimiter: "auto"`) cobrem tudo — só o `transformHeader` precisa ser explícito.

### csv-parse → csv-kit (pcp-supplier-service.ts)

```ts
// Antes
const { parse } = await import("csv-parse/sync")
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  delimiter: ";",
  quote: '"',
  escape: '"',
  relax_quotes: true,
  relax_column_count: true,
})

// Depois
import { parse } from "csv-kit"
const records = parse(csvContent, {
  delimiter: ";",
  relaxed: true,
})
```

Os defaults de csv-kit (`header: true`, `skipEmptyLines: true`, `trim: true`) cobrem a maioria. Só `delimiter` e `relaxed` precisam ser explícitos.

### Utilitário manual → csv-kit (pcp-csv.ts + pcp-declarations.tsx)

```ts
// Antes — 50 linhas de string concatenation manual + BOM manual
const escapeCSVValue = (value: string): string => {
  const stringValue = String(value)
  return `"${stringValue.replace(/"/g, '""')}"`
}
// ... montagem manual de headers e linhas
// ... BOM manual: const bom = "\uFEFF"; new Blob([bom + csvData], ...)

// Depois
import { generate } from "csv-kit"
const csv = generate(items, {
  delimiter: ";",
  bom: true,
  columns: hasGroup
    ? {
        processNumber: "Número do Processo (Não edite)",
        id: "ID (Não edite)",
        group: "Lote (Não edite)",
        item: "Item (Não edite)",
        // ...
      }
    : {
        processNumber: "Número do Processo (Não edite)",
        id: "ID (Não edite)",
        item: "Item (Não edite)",
        // ...
      },
})
// BOM já incluso na string — Blob direto: new Blob([csv], { type: "text/csv;charset=utf-8;" })
```

## Referências

- [RFC 4180 — CSV Format Specification](https://www.rfc-editor.org/rfc/rfc4180.html)
- [PapaParse](https://www.papaparse.com/) — referência de API e auto-detect
- [csv42](https://github.com/josdejong/csv42) — referência de lib minimalista (2KB gzipped)
- [csv.js](https://github.com/okfn/csv.js/) — referência de lib zero-dep isomórfica
- [JS CSV Parsers Comparison](https://leanylabs.com/blog/js-csv-parsers-benchmarks/)
