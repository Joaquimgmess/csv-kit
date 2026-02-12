import { escapeField } from "./utils"

export interface GenerateOptions {
  header?: boolean
  delimiter?: string
  columns?: string[] | Record<string, string>
  newline?: string
  bom?: boolean
}

export function generate<T extends Record<string, unknown>>(data: T[], options?: GenerateOptions): string {
  const includeHeader = options?.header ?? true
  const delimiter = options?.delimiter ?? ","
  const newline = options?.newline ?? "\n"
  const bom = options?.bom ?? false
  const columns = options?.columns

  // Determine keys (object property names) and headers (CSV column names)
  let keys: string[]
  let headers: string[]

  if (Array.isArray(columns)) {
    keys = columns
    headers = columns
  } else if (columns && typeof columns === "object") {
    keys = Object.keys(columns)
    headers = Object.values(columns)
  } else if (data.length > 0) {
    keys = Object.keys(data[0])
    headers = keys
  } else {
    keys = []
    headers = []
  }

  const lines: string[] = []

  if (includeHeader && headers.length > 0) {
    lines.push(headers.map((h) => escapeField(h, delimiter)).join(delimiter))
  }

  for (const row of data) {
    const values = keys.map((key) => {
      const raw = row[key]
      const value = raw == null ? "" : String(raw)
      return escapeField(value, delimiter)
    })
    lines.push(values.join(delimiter))
  }

  const result = lines.join(newline)
  return bom ? "\uFEFF" + result : result
}
