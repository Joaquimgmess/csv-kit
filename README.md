# csv-kit

Isomorphic CSV parser and generator. Zero dependencies. TypeScript-first.

- **Two functions**: `parse` and `generate`
- **Sensible defaults**: works without configuration in 90% of cases
- **RFC 4180 compliant**: with relaxed mode for real-world malformed CSVs
- **Auto-detect delimiter**: comma, semicolon, tab, pipe
- **Runs anywhere**: pure string manipulation, no runtime-specific APIs

## Install

```sh
# bun
bun add csv-kit

# npm
npm install csv-kit

# jsr
deno add @your-scope/csv-kit
```

## Parse

```ts
import { parse } from "csv-kit"

// Defaults: header, auto-detect delimiter, trim, skip empty lines
const rows = parse<{ name: string; value: string }>(csvString)

// Brazilian CSV with semicolons — auto-detected
const rows = parse(csvString)

// Raw mode — returns string[][]
const raw = parse(csvString, { header: false })
```

### ParseOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `header` | `boolean` | `true` | First line as object keys |
| `delimiter` | `string \| "auto"` | `"auto"` | Delimiter. `"auto"` detects from `,` `;` `\t` `\|` |
| `skipEmptyLines` | `boolean` | `true` | Skip empty lines |
| `trim` | `boolean` | `true` | Trim each value |
| `transformHeader` | `(header: string, index: number) => string` | — | Transform header names |
| `relaxed` | `boolean` | `false` | Tolerate malformed quotes and inconsistent columns |

### Error handling

**Strict mode** (default): throws descriptive errors.

```
csv-kit: row 3 has 3 fields, expected 5
csv-kit: unclosed quote at row 2
```

**Relaxed mode** (`relaxed: true`): never throws. Missing columns filled with `""`, unclosed quotes treated as literal text.

## Generate

```ts
import { generate } from "csv-kit"

const csv = generate(rows)

// Custom delimiter + BOM for Excel
const csv = generate(rows, { delimiter: ";", bom: true })

// Rename headers
const csv = generate(items, {
  columns: {
    processNumber: "Process Number",
    item: "Item",
    value: "Unit Value",
  }
})
```

### GenerateOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `header` | `boolean` | `true` | Include header line |
| `delimiter` | `string` | `","` | Field delimiter |
| `columns` | `string[] \| Record<string, string>` | — | Select/order/rename columns |
| `newline` | `string` | `"\n"` | Line break character |
| `bom` | `boolean` | `false` | Prefix UTF-8 BOM (for Excel on Windows) |

### Value conversion

- `null` / `undefined` → `""` (empty string)
- Everything else → `String(value)`

Values containing the delimiter, quotes, or line breaks are automatically escaped per RFC 4180.

## License

MIT
