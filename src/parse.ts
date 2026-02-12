import { detectDelimiter, splitFields, splitLines } from "./utils";

export interface ParseOptions {
	header?: boolean;
	delimiter?: string | "auto";
	skipEmptyLines?: boolean;
	trim?: boolean;
	transformHeader?: (header: string, index: number) => string;
	relaxed?: boolean;
}

export function parse<T = Record<string, string>>(
	csv: string,
	options?: ParseOptions & { header?: true },
): T[];
export function parse(
	csv: string,
	options: ParseOptions & { header: false },
): string[][];
export function parse(csv: string, options?: ParseOptions): unknown[] {
	if (typeof csv !== "string") {
		throw new Error("csv-kit: input must be a string");
	}

	const header = options?.header ?? true;
	const delimiter = options?.delimiter ?? "auto";
	const skipEmptyLines = options?.skipEmptyLines ?? true;
	const trim = options?.trim ?? true;
	const transformHeader = options?.transformHeader;
	const relaxed = options?.relaxed ?? false;

	let input = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
	input = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

	let lines = splitLines(input);

	if (skipEmptyLines) {
		lines = lines.filter((line) => line.length > 0);
	}

	if (lines.length === 0) return [];

	const delim =
		delimiter === "auto" ? detectDelimiter(lines.slice(0, 10)) : delimiter;

	if (header) {
		return parseWithHeader(lines, delim, trim, transformHeader, relaxed);
	}

	return parseWithoutHeader(lines, delim, trim, relaxed);
}

function parseWithHeader(
	lines: string[],
	delimiter: string,
	trim: boolean,
	transformHeader: ((header: string, index: number) => string) | undefined,
	relaxed: boolean,
): Record<string, string>[] {
	const firstLine = lines[0]!;
	const headerFields = splitFields(firstLine, delimiter, relaxed);

	if (headerFields === null) {
		throw new Error("csv-kit: unclosed quote at row 1");
	}

	const headers = headerFields.map((h, i) => {
		let value = trim ? h.trim() : h;
		if (transformHeader) value = transformHeader(value, i);
		return value;
	});

	const results: Record<string, string>[] = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]!;
		const fields = splitFields(line, delimiter, relaxed);

		if (fields === null) {
			throw new Error(`csv-kit: unclosed quote at row ${i + 1}`);
		}

		if (!relaxed && fields.length !== headers.length) {
			throw new Error(
				`csv-kit: row ${i + 1} has ${fields.length} fields, expected ${headers.length}`,
			);
		}

		const row: Record<string, string> = {};
		for (let j = 0; j < headers.length; j++) {
			const header = headers[j]!;
			let value = j < fields.length ? fields[j]! : "";
			if (trim) value = value.trim();
			row[header] = value;
		}

		if (relaxed && fields.length > headers.length) {
			for (let j = headers.length; j < fields.length; j++) {
				let value = fields[j]!;
				if (trim) value = value.trim();
				row[`_col${j}`] = value;
			}
		}

		results.push(row);
	}

	return results;
}

function parseWithoutHeader(
	lines: string[],
	delimiter: string,
	trim: boolean,
	relaxed: boolean,
): string[][] {
	const results: string[][] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const fields = splitFields(line, delimiter, relaxed);

		if (fields === null) {
			throw new Error(`csv-kit: unclosed quote at row ${i + 1}`);
		}

		if (trim) {
			results.push(fields.map((f) => f.trim()));
		} else {
			results.push(fields);
		}
	}

	return results;
}
