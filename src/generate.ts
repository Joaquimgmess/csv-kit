export interface GenerateOptions {
  header?: boolean
  delimiter?: string
  columns?: string[] | Record<string, string>
  newline?: string
  bom?: boolean
}

export function generate<T extends Record<string, unknown>>(data: T[], _options?: GenerateOptions): string {
  // TODO: implement
  return ""
}
