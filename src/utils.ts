const DELIMITERS = [",", ";", "\t", "|"] as const;

/**
 * Counts occurrences of a delimiter in a string, ignoring characters inside quoted fields.
 */
function countOutsideQuotes(line: string, delimiter: string): number {
	let count = 0;
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (!inQuotes && char === delimiter) {
			count++;
		}
	}

	return count;
}

/**
 * Detects the most likely delimiter by analyzing up to 10 lines.
 * Picks the delimiter with the most consistent non-zero count across lines.
 * Ties broken by priority: , > ; > \t > |
 */
export function detectDelimiter(lines: string[]): string {
	if (lines.length === 0) return ",";

	let bestDelimiter = ",";
	let bestScore = -1;

	for (const delimiter of DELIMITERS) {
		const counts = lines.map((line) => countOutsideQuotes(line, delimiter));
		const nonZero = counts.filter((c) => c > 0);

		if (nonZero.length === 0) continue;

		const mode = nonZero.sort((a, b) => a - b)[Math.floor(nonZero.length / 2)];
		const consistent = counts.filter((c) => c === mode).length;
		const score = consistent * 1000 + nonZero.length;

		if (score > bestScore) {
			bestScore = score;
			bestDelimiter = delimiter;
		}
	}

	return bestDelimiter;
}

/**
 * Splits a CSV string into lines, respecting line breaks inside quoted fields.
 * Supports \r\n, \r, and \n.
 */
export function splitLines(csv: string): string[] {
	const lines: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < csv.length; i++) {
		const char = csv[i];

		if (char === '"') {
			inQuotes = !inQuotes;
			current += char;
		} else if (!inQuotes && (char === "\r" || char === "\n")) {
			if (char === "\r" && csv[i + 1] === "\n") {
				i++;
			}
			lines.push(current);
			current = "";
		} else {
			current += char;
		}
	}

	if (current.length > 0) {
		lines.push(current);
	}

	return lines;
}

/**
 * Splits a line into fields by delimiter, respecting quoted fields.
 * In relaxed mode, unclosed quotes are treated as literal text.
 * In strict mode, returns null to signal an error.
 */
export function splitFields(
	line: string,
	delimiter: string,
	relaxed: boolean,
): string[] | null {
	const fields: string[] = [];
	let current = "";
	let inQuotes = false;
	let i = 0;

	while (i < line.length) {
		const char = line[i];

		if (!inQuotes) {
			if (char === delimiter) {
				fields.push(current);
				current = "";
				i++;
			} else if (char === '"' && current.length === 0) {
				inQuotes = true;
				i++;
			} else {
				current += char;
				i++;
			}
		} else {
			if (char === '"') {
				if (i + 1 < line.length && line[i + 1] === '"') {
					current += '"';
					i += 2;
				} else {
					inQuotes = false;
					i++;
				}
			} else {
				current += char;
				i++;
			}
		}
	}

	if (inQuotes) {
		if (!relaxed) return null;
	}

	fields.push(current);

	return fields;
}

/**
 * Wraps a value in quotes if it contains the delimiter, quotes, or line breaks.
 * Escapes internal quotes as "".
 */
export function escapeField(value: string, delimiter: string): string {
	const needsQuoting =
		value.includes(delimiter) ||
		value.includes('"') ||
		value.includes("\n") ||
		value.includes("\r");

	if (!needsQuoting) return value;

	return '"' + value.replace(/"/g, '""') + '"';
}
