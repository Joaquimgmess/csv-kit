import { describe, expect, test } from "bun:test";
import { generate } from "../src/generate";

describe("generate — basics", () => {
	test("simple object array", () => {
		const data = [
			{ nome: "Alice", valor: "10" },
			{ nome: "Bob", valor: "20" },
		];
		expect(generate(data)).toBe("nome,valor\nAlice,10\nBob,20");
	});

	test("custom delimiter", () => {
		const data = [{ a: "1", b: "2" }];
		expect(generate(data, { delimiter: ";" })).toBe("a;b\n1;2");
	});

	test("custom newline", () => {
		const data = [{ a: "1" }, { a: "2" }];
		expect(generate(data, { newline: "\r\n" })).toBe("a\r\n1\r\n2");
	});

	test("empty array returns empty string", () => {
		expect(generate([])).toBe("");
	});

	test("empty array with header: true returns empty string (no columns to infer)", () => {
		expect(generate([], { header: true })).toBe("");
	});
});

describe("generate — header", () => {
	test("header: false omits header line", () => {
		const data = [{ a: "1", b: "2" }];
		expect(generate(data, { header: false })).toBe("1,2");
	});

	test("header: true is default", () => {
		const data = [{ a: "1" }];
		const result = generate(data);
		expect(result.startsWith("a\n")).toBe(true);
	});
});

describe("generate — columns as string[]", () => {
	test("selects and orders columns", () => {
		const data = [{ a: "1", b: "2", c: "3" }];
		expect(generate(data, { columns: ["c", "a"] })).toBe("c,a\n3,1");
	});

	test("missing column in data becomes empty string", () => {
		const data = [{ a: "1" }];
		expect(generate(data, { columns: ["a", "b"] })).toBe("a,b\n1,");
	});
});

describe("generate — columns as Record<string, string>", () => {
	test("renames headers", () => {
		const data = [{ name: "Alice", value: "10" }];
		const result = generate(data, {
			columns: { name: "Nome", value: "Valor" },
		});
		expect(result).toBe("Nome,Valor\nAlice,10");
	});

	test("selects and orders by Record key order", () => {
		const data = [{ a: "1", b: "2", c: "3" }];
		const result = generate(data, {
			columns: { c: "Col C", a: "Col A" },
		});
		expect(result).toBe("Col C,Col A\n3,1");
	});

	test("header: false with Record still uses keys for data extraction", () => {
		const data = [{ name: "Alice", value: "10" }];
		const result = generate(data, {
			header: false,
			columns: { name: "Nome", value: "Valor" },
		});
		expect(result).toBe("Alice,10");
	});
});

describe("generate — escaping", () => {
	test("quotes values containing delimiter", () => {
		const data = [{ a: "hello, world" }];
		expect(generate(data)).toBe('a\n"hello, world"');
	});

	test("escapes double quotes", () => {
		const data = [{ a: 'said "hi"' }];
		expect(generate(data)).toBe('a\n"said ""hi"""');
	});

	test("quotes values with line breaks", () => {
		const data = [{ a: "line1\nline2" }];
		expect(generate(data)).toBe('a\n"line1\nline2"');
	});

	test("escapes header values too", () => {
		const data = [{ "a,b": "1" }];
		expect(generate(data)).toBe('"a,b"\n1');
	});

	test("escapes renamed headers with special characters", () => {
		const data = [{ id: "1" }];
		const result = generate(data, {
			delimiter: ";",
			columns: { id: "ID (Não edite)" },
		});
		expect(result).toBe("ID (Não edite)\n1");
	});
});

describe("generate — value conversion", () => {
	test("null becomes empty string", () => {
		const data = [{ a: null }];
		expect(generate(data)).toBe("a\n");
	});

	test("undefined becomes empty string", () => {
		const data = [{ a: undefined }];
		expect(generate(data)).toBe("a\n");
	});

	test("number becomes String(number)", () => {
		const data = [{ a: 1500.5 }];
		expect(generate(data)).toBe("a\n1500.5");
	});

	test("boolean becomes String(boolean)", () => {
		const data = [{ a: true, b: false }];
		expect(generate(data)).toBe("a,b\ntrue,false");
	});

	test("zero is preserved (not empty string)", () => {
		const data = [{ a: 0 }];
		expect(generate(data)).toBe("a\n0");
	});
});

describe("generate — bom", () => {
	test("bom: false (default) does not prefix BOM", () => {
		const data = [{ a: "1" }];
		const result = generate(data);
		expect(result.charCodeAt(0)).not.toBe(0xfeff);
	});

	test("bom: true prefixes UTF-8 BOM", () => {
		const data = [{ a: "1" }];
		const result = generate(data, { bom: true });
		expect(result.charCodeAt(0)).toBe(0xfeff);
		expect(result.slice(1)).toBe("a\n1");
	});

	test("bom: true on empty array returns just BOM", () => {
		const result = generate([], { bom: true });
		expect(result).toBe("\uFEFF");
	});
});

describe("generate — roundtrip with parse", async () => {
	const { parse } = await import("../src/parse");

	test("generate then parse returns original data", () => {
		const data = [
			{ nome: "Alice", valor: "10" },
			{ nome: "Bob", valor: "20" },
		];
		const csv = generate(data);
		const parsed = parse(csv);
		expect(parsed).toEqual(data);
	});

	test("roundtrip with special characters", () => {
		const data = [{ nome: 'Empresa "X"', desc: "valor, com virgula" }];
		const csv = generate(data);
		const parsed = parse(csv);
		expect(parsed).toEqual(data);
	});

	test("roundtrip with BOM", () => {
		const data = [{ a: "1", b: "2" }];
		const csv = generate(data, { bom: true });
		const parsed = parse(csv);
		expect(parsed).toEqual(data);
	});
});
