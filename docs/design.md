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

### `parse<T>(csv: string, options?: ParseOptions): T[]`

Converte uma string CSV em array de objetos tipados.

```ts
import { parse } from "csv-kit"

const rows = parse<{ nome: string; valor: string }>(csvString)
```

#### ParseOptions

| Opção | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `header` | `boolean` | `true` | Primeira linha como chaves dos objetos |
| `delimiter` | `string \| "auto"` | `"auto"` | Delimitador. `"auto"` detecta entre `,` `;` `\t` `\|` |
| `skipEmptyLines` | `boolean` | `true` | Pular linhas vazias |
| `trim` | `boolean` | `true` | Trim em cada valor |
| `transformHeader` | `(header: string, index: number) => string` | `undefined` | Transformar nomes dos headers |
| `relaxed` | `boolean` | `false` | Tolerar quotes malformadas e colunas inconsistentes |

#### Retorno

Quando `header: true` (default): `T[]` — array de objetos com headers como chaves.

Quando `header: false`: `string[][]` — array de arrays de strings.

#### Auto-detect de delimitador

Algoritmo: contar ocorrências de cada candidato (`,`, `;`, `\t`, `|`) na primeira linha. O mais frequente vence. Em caso de empate, prioridade na ordem listada.

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
| `columns` | `string[]` | `undefined` | Quais colunas incluir e em que ordem. `undefined` = todas (extraídas do primeiro objeto) |
| `newline` | `string` | `"\n"` | Caractere de quebra de linha |

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

#### `detectDelimiter(line: string): string`

Conta ocorrências de `,` `;` `\t` `|` na primeira linha (fora de campos entre aspas). Retorna o mais frequente.

#### `splitLines(csv: string): string[]`

Faz split respeitando line breaks dentro de campos entre aspas. Suporta `\r\n`, `\r` e `\n`.

#### `splitFields(line: string, delimiter: string, relaxed: boolean): string[]`

Faz split de uma linha em campos, respeitando aspas. No modo `relaxed`, aspas não fechadas são tratadas como texto literal.

#### `escapeField(value: string, delimiter: string): string`

Envolve o valor em aspas se necessário (contém delimitador, aspas, ou line break). Escapa aspas internas com `""`.

### parse.ts

1. Normalizar line endings para `\n`
2. Se `delimiter` é `"auto"`, detectar com `detectDelimiter`
3. Fazer `splitLines` respeitando campos entre aspas
4. Se `skipEmptyLines`, filtrar linhas vazias
5. Primeira linha como headers (se `header: true`), aplicar `transformHeader`
6. Para cada linha restante, `splitFields` e mapear para objeto
7. Se `trim`, aplicar trim em cada valor
8. Se `relaxed` e linha tem menos campos que headers, preencher com `""`

### generate.ts

1. Determinar colunas: `options.columns` ou `Object.keys(data[0])`
2. Se `header: true`, gerar linha de header
3. Para cada objeto, extrair valores na ordem das colunas
4. Aplicar `escapeField` em cada valor
5. Juntar com delimitador e newline

## Casos de Teste

### parse

- CSV simples com vírgula
- CSV com ponto-e-vírgula (padrão brasileiro)
- Auto-detect de delimitador
- Campos entre aspas com vírgulas dentro
- Campos entre aspas com aspas internas (`""`)
- Campos com line breaks dentro de aspas
- Linhas vazias no meio do arquivo
- Header com transformação (lowercase, snake_case)
- `header: false` retornando `string[][]`
- Modo `relaxed`: aspas não fechadas
- Modo `relaxed`: linhas com número inconsistente de colunas
- Trim em valores com espaços
- CSV vazio retorna `[]`
- CSV com apenas header retorna `[]`
- BOM UTF-8 no início do arquivo

### generate

- Array de objetos simples
- Delimitador customizado (`;`)
- Subset de colunas com `columns`
- Valores com vírgula são envoltos em aspas
- Valores com aspas são escapados com `""`
- Valores com line breaks são envoltos em aspas
- `header: false` omite linha de header
- Array vazio retorna `""` (ou só o header se `header: true`)
- Valores `null` e `undefined` viram string vazia

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

### Utilitário manual → csv-kit (pcp-csv.ts)

```ts
// Antes — 50 linhas de string concatenation manual
const escapeCSVValue = (value: string): string => {
  const stringValue = String(value)
  return `"${stringValue.replace(/"/g, '""')}"`
}
// ... montagem manual de headers e linhas

// Depois
import { generate } from "csv-kit"
const csv = generate(items, {
  delimiter: ";",
  columns: hasGroup
    ? ["processNumber", "id", "group", "item", ...]
    : ["processNumber", "id", "item", ...],
})
```

## Referências

- [RFC 4180 — CSV Format Specification](https://www.rfc-editor.org/rfc/rfc4180.html)
- [PapaParse](https://www.papaparse.com/) — referência de API e auto-detect
- [csv42](https://github.com/josdejong/csv42) — referência de lib minimalista (2KB gzipped)
- [csv.js](https://github.com/okfn/csv.js/) — referência de lib zero-dep isomórfica
- [JS CSV Parsers Comparison](https://leanylabs.com/blog/js-csv-parsers-benchmarks/)
