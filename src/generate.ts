import { escapeField } from "./utils";

/** Options for the {@link generate} function. */
export interface GenerateOptions {
	/** Include a header line. @default true */
	header?: boolean;
	/** Field delimiter. @default "," */
	delimiter?: string;
	/** Select, order, and optionally rename columns. `string[]` uses keys as headers. `Record` maps object key → CSV header name. */
	columns?: string[] | Record<string, string>;
	/** Line break character. @default "\n" */
	newline?: string;
	/** Prefix UTF-8 BOM (`\uFEFF`) for Excel compatibility on Windows. @default false */
	bom?: boolean;
}

/**
 * Converts an array of objects into a CSV string.
 *
 * Values are automatically escaped per RFC 4180. `null`/`undefined` become
 * empty strings, other types are converted via `String()`.
 *
 * @param data Array of objects to convert.
 * @param options Generation options. See {@link GenerateOptions}.
 * @returns The CSV string.
 *
 * @example
 * ```ts
 * generate([{ name: "Alice", age: 30 }])
 * // "name,age\nAlice,30"
 *
 * generate(items, {
 *   delimiter: ";",
 *   bom: true,
 *   columns: { name: "Nome", age: "Idade" },
 * })
 * ```
 */
export function generate<T extends Record<string, unknown>>(
	data: T[],
	options?: GenerateOptions,
): string {
	const includeHeader = options?.header ?? true;
	const delimiter = options?.delimiter ?? ",";
	const newline = options?.newline ?? "\n";
	const bom = options?.bom ?? false;
	const columns = options?.columns;

	// Determine keys (object property names) and headers (CSV column names)
	let keys: string[];
	let headers: string[];

	if (Array.isArray(columns)) {
		keys = columns;
		headers = columns;
	} else if (columns && typeof columns === "object") {
		keys = Object.keys(columns);
		headers = Object.values(columns);
	} else if (data.length > 0) {
		keys = Object.keys(data[0]!);
		headers = keys;
	} else {
		keys = [];
		headers = [];
	}

	const lines: string[] = [];

	if (includeHeader && headers.length > 0) {
		lines.push(headers.map((h) => escapeField(h, delimiter)).join(delimiter));
	}

	for (const row of data) {
		const values = keys.map((key) => {
			const raw = row[key];
			const value = raw == null ? "" : String(raw);
			return escapeField(value, delimiter);
		});
		lines.push(values.join(delimiter));
	}

	const result = lines.join(newline);
	return bom ? "\uFEFF" + result : result;
}
