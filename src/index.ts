/**
 * Isomorphic CSV parser and generator. Zero dependencies. TypeScript-first.
 *
 * @example
 * ```ts
 * import { parse, generate } from "@juaquito/csv-kit"
 *
 * const rows = parse<{ name: string }>("name\nAlice\nBob")
 * const csv = generate(rows, { delimiter: ";", bom: true })
 * ```
 *
 * @module
 */
export type { GenerateOptions } from "./generate";
export { generate } from "./generate";

export type { ParseOptions } from "./parse";
export { parse } from "./parse";
