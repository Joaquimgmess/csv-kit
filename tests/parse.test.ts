import { describe, expect, test } from "bun:test"
import { parse } from "../src/parse"

describe("parse — basics", () => {
  test("simple CSV with comma", () => {
    const csv = "nome,valor\nAlice,10\nBob,20"
    expect(parse(csv)).toEqual([
      { nome: "Alice", valor: "10" },
      { nome: "Bob", valor: "20" },
    ])
  })

  test("CSV with semicolon (Brazilian standard)", () => {
    const csv = "nome;valor\nAlice;10\nBob;20"
    expect(parse(csv)).toEqual([
      { nome: "Alice", valor: "10" },
      { nome: "Bob", valor: "20" },
    ])
  })

  test("auto-detect delimiter", () => {
    const csv = "a;b;c\n1;2;3\n4;5;6"
    expect(parse(csv)).toEqual([
      { a: "1", b: "2", c: "3" },
      { a: "4", b: "5", c: "6" },
    ])
  })

  test("explicit delimiter overrides auto-detect", () => {
    const csv = "a;b;c\n1;2;3"
    expect(parse(csv, { delimiter: ";" })).toEqual([
      { a: "1", b: "2", c: "3" },
    ])
  })

  test("empty CSV returns empty array", () => {
    expect(parse("")).toEqual([])
  })

  test("CSV with only header returns empty array", () => {
    expect(parse("a,b,c")).toEqual([])
  })

  test("CSV with only header and trailing newline returns empty array", () => {
    expect(parse("a,b,c\n")).toEqual([])
  })
})

describe("parse — quoted fields", () => {
  test("quoted field with comma inside", () => {
    const csv = 'nome,desc\nAlice,"valor, com virgula"'
    expect(parse(csv)).toEqual([
      { nome: "Alice", desc: "valor, com virgula" },
    ])
  })

  test("quoted field with internal quotes escaped as double quotes", () => {
    const csv = 'nome,desc\nAlice,"disse ""oi"""'
    expect(parse(csv)).toEqual([
      { nome: "Alice", desc: 'disse "oi"' },
    ])
  })

  test("quoted field with line break inside", () => {
    const csv = 'nome,desc\nAlice,"linha1\nlinha2"'
    expect(parse(csv)).toEqual([
      { nome: "Alice", desc: "linha1\nlinha2" },
    ])
  })
})

describe("parse — header options", () => {
  test("header: false returns string[][]", () => {
    const csv = "a,b,c\n1,2,3"
    const result = parse(csv, { header: false })
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ])
  })

  test("transformHeader applies transformation", () => {
    const csv = "Nome Completo,Valor Total\nAlice,10"
    const result = parse(csv, {
      transformHeader: (h) => h.toLowerCase().replace(/\s+/g, "_"),
    })
    expect(result).toEqual([
      { nome_completo: "Alice", valor_total: "10" },
    ])
  })

  test("transformHeader receives index", () => {
    const csv = "a,b\n1,2"
    const indices: number[] = []
    parse(csv, {
      transformHeader: (h, i) => {
        indices.push(i)
        return h
      },
    })
    expect(indices).toEqual([0, 1])
  })
})

describe("parse — trim", () => {
  test("trims values by default", () => {
    const csv = "nome , valor \n Alice , 10 "
    expect(parse(csv)).toEqual([
      { nome: "Alice", valor: "10" },
    ])
  })

  test("trim: false preserves whitespace", () => {
    const csv = "nome , valor \n Alice , 10 "
    expect(parse(csv, { trim: false })).toEqual([
      { "nome ": " Alice ", " valor ": " 10 " },
    ])
  })
})

describe("parse — skipEmptyLines", () => {
  test("skips empty lines by default", () => {
    const csv = "a,b\n\n1,2\n\n3,4"
    expect(parse(csv)).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ])
  })

  test("skipEmptyLines: false preserves empty lines", () => {
    const csv = "a,b\n1,2\n\n3,4"
    const result = parse(csv, { skipEmptyLines: false, header: false })
    expect(result).toEqual([
      ["a", "b"],
      ["1", "2"],
      [""],
      ["3", "4"],
    ])
  })
})

describe("parse — BOM", () => {
  test("strips UTF-8 BOM from beginning", () => {
    const csv = "\uFEFFnome,valor\nAlice,10"
    expect(parse(csv)).toEqual([
      { nome: "Alice", valor: "10" },
    ])
  })

  test("BOM does not affect header name", () => {
    const csv = "\uFEFFnome,valor\nAlice,10"
    const result = parse(csv)
    expect(Object.keys(result[0])).toEqual(["nome", "valor"])
  })
})

describe("parse — line endings", () => {
  test("handles \\r\\n", () => {
    const csv = "a,b\r\n1,2\r\n3,4"
    expect(parse(csv)).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ])
  })

  test("handles \\r", () => {
    const csv = "a,b\r1,2\r3,4"
    expect(parse(csv)).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ])
  })
})

describe("parse — strict mode (default)", () => {
  test("throws on unclosed quote", () => {
    const csv = 'a,b\n"unclosed,value'
    expect(() => parse(csv)).toThrow("csv-kit: unclosed quote at row 2")
  })

  test("throws on inconsistent column count", () => {
    const csv = "a,b,c\n1,2"
    expect(() => parse(csv)).toThrow(
      "csv-kit: row 2 has 2 fields, expected 3",
    )
  })

  test("throws on extra columns", () => {
    const csv = "a,b\n1,2,3"
    expect(() => parse(csv)).toThrow(
      "csv-kit: row 2 has 3 fields, expected 2",
    )
  })
})

describe("parse — relaxed mode", () => {
  test("tolerates unclosed quotes", () => {
    const csv = 'a,b\n"unclosed,value'
    const result = parse(csv, { relaxed: true })
    expect(result.length).toBe(1)
  })

  test("fills missing columns with empty string", () => {
    const csv = "a,b,c\n1,2"
    const result = parse(csv, { relaxed: true })
    expect(result).toEqual([{ a: "1", b: "2", c: "" }])
  })

  test("preserves extra columns", () => {
    const csv = "a,b\n1,2,3"
    const result = parse(csv, { relaxed: true })
    expect(result).toEqual([{ a: "1", b: "2", _col2: "3" }])
  })
})

describe("parse — input validation", () => {
  test("throws on null input", () => {
    expect(() => parse(null as unknown as string)).toThrow(
      "csv-kit: input must be a string",
    )
  })

  test("throws on undefined input", () => {
    expect(() => parse(undefined as unknown as string)).toThrow(
      "csv-kit: input must be a string",
    )
  })

  test("throws on number input", () => {
    expect(() => parse(123 as unknown as string)).toThrow(
      "csv-kit: input must be a string",
    )
  })
})

describe("parse — auto-detect with single-field header", () => {
  test("does not pick wrong delimiter when header has one field", () => {
    const csv = "Titulo\na;b;c\n1;2;3"
    expect(parse(csv, { relaxed: true })).toEqual([
      { Titulo: "a", _col1: "b", _col2: "c" },
      { Titulo: "1", _col1: "2", _col2: "3" },
    ])
  })
})
