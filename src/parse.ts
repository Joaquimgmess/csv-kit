export interface ParseOptions {
  header?: boolean
  delimiter?: string | "auto"
  skipEmptyLines?: boolean
  trim?: boolean
  transformHeader?: (header: string, index: number) => string
  relaxed?: boolean
}

export function parse<T = Record<string, string>>(csv: string, options?: ParseOptions & { header?: true }): T[]
export function parse(csv: string, options: ParseOptions & { header: false }): string[][]
export function parse(csv: string, _options?: ParseOptions): unknown[] {
  // TODO: implement
  return []
}
