import { describe, expect, test } from "bun:test"
import { detectDelimiter, splitLines, splitFields, escapeField } from "../src/utils"

// --- detectDelimiter ---

describe("detectDelimiter", () => {
  test("detects comma", () => {
    expect(detectDelimiter(["a,b,c", "1,2,3"])).toBe(",")
  })

  test("detects semicolon", () => {
    expect(detectDelimiter(["a;b;c", "1;2;3"])).toBe(";")
  })

  test("detects tab", () => {
    expect(detectDelimiter(["a\tb\tc", "1\t2\t3"])).toBe("\t")
  })

  test("detects pipe", () => {
    expect(detectDelimiter(["a|b|c", "1|2|3"])).toBe("|")
  })

  test("defaults to comma when no delimiters found", () => {
    expect(detectDelimiter(["abc"])).toBe(",")
  })

  test("defaults to comma on empty input", () => {
    expect(detectDelimiter([])).toBe(",")
  })

  test("ignores delimiters inside quotes", () => {
    expect(detectDelimiter(['"a,b";c;d', "1;2;3"])).toBe(";")
  })

  test("header with single field does not mislead detection", () => {
    expect(detectDelimiter(["Titulo", "a;b;c", "1;2;3"])).toBe(";")
  })

  test("priority: comma wins tie over semicolon", () => {
    expect(detectDelimiter(["a,b;c", "1,2;3"])).toBe(",")
  })

  test("consistency wins over frequency", () => {
    // semicolon is consistent (2 per line), comma appears only in some lines
    const lines = [
      "a;b;c",
      "1;2;3",
      "x;y;z",
      "a,b;c;d", // comma appears once, semicolon twice
    ]
    expect(detectDelimiter(lines)).toBe(";")
  })
})

// --- splitLines ---

describe("splitLines", () => {
  test("splits by \\n", () => {
    expect(splitLines("a\nb\nc")).toEqual(["a", "b", "c"])
  })

  test("splits by \\r\\n", () => {
    expect(splitLines("a\r\nb\r\nc")).toEqual(["a", "b", "c"])
  })

  test("splits by \\r", () => {
    expect(splitLines("a\rb\rc")).toEqual(["a", "b", "c"])
  })

  test("preserves line breaks inside quotes", () => {
    expect(splitLines('"a\nb",c\nd,e')).toEqual(['"a\nb",c', "d,e"])
  })

  test("handles trailing line break", () => {
    expect(splitLines("a\nb\n")).toEqual(["a", "b"])
  })

  test("single line without line break", () => {
    expect(splitLines("a,b,c")).toEqual(["a,b,c"])
  })

  test("empty string returns empty array", () => {
    expect(splitLines("")).toEqual([])
  })

  test("mixed line endings", () => {
    expect(splitLines("a\r\nb\nc\rd")).toEqual(["a", "b", "c", "d"])
  })
})

// --- splitFields ---

describe("splitFields", () => {
  test("splits simple comma-separated fields", () => {
    expect(splitFields("a,b,c", ",", false)).toEqual(["a", "b", "c"])
  })

  test("splits semicolon-separated fields", () => {
    expect(splitFields("a;b;c", ";", false)).toEqual(["a", "b", "c"])
  })

  test("handles quoted field with delimiter inside", () => {
    expect(splitFields('"a,b",c,d', ",", false)).toEqual(["a,b", "c", "d"])
  })

  test("handles escaped quotes inside quoted field", () => {
    expect(splitFields('"a""b",c', ",", false)).toEqual(['a"b', "c"])
  })

  test("handles empty fields", () => {
    expect(splitFields("a,,c", ",", false)).toEqual(["a", "", "c"])
  })

  test("handles single field", () => {
    expect(splitFields("abc", ",", false)).toEqual(["abc"])
  })

  test("handles empty line", () => {
    expect(splitFields("", ",", false)).toEqual([""])
  })

  test("strict mode: returns null on unclosed quote", () => {
    expect(splitFields('"abc', ",", false)).toBeNull()
  })

  test("relaxed mode: unclosed quote treated as literal", () => {
    const result = splitFields('"abc', ",", true)
    expect(result).not.toBeNull()
    expect(result!.length).toBe(1)
  })

  test("quoted field with line break inside", () => {
    expect(splitFields('"a\nb",c', ",", false)).toEqual(["a\nb", "c"])
  })

  test("all fields quoted", () => {
    expect(splitFields('"a","b","c"', ",", false)).toEqual(["a", "b", "c"])
  })

  test("trailing delimiter produces empty last field", () => {
    expect(splitFields("a,b,", ",", false)).toEqual(["a", "b", ""])
  })

  test("multiple escaped quotes in one field", () => {
    expect(splitFields('"he said ""hello"" and ""bye"""', ",", false)).toEqual(['he said "hello" and "bye"'])
  })
})

// --- escapeField ---

describe("escapeField", () => {
  test("returns value as-is when no quoting needed", () => {
    expect(escapeField("abc", ",")).toBe("abc")
  })

  test("quotes value containing delimiter", () => {
    expect(escapeField("a,b", ",")).toBe('"a,b"')
  })

  test("quotes value containing double quotes and escapes them", () => {
    expect(escapeField('a"b', ",")).toBe('"a""b"')
  })

  test("quotes value containing newline", () => {
    expect(escapeField("a\nb", ",")).toBe('"a\nb"')
  })

  test("quotes value containing carriage return", () => {
    expect(escapeField("a\rb", ",")).toBe('"a\rb"')
  })

  test("handles value with both delimiter and quotes", () => {
    expect(escapeField('a,b"c', ",")).toBe('"a,b""c"')
  })

  test("respects custom delimiter", () => {
    expect(escapeField("a;b", ";")).toBe('"a;b"')
    expect(escapeField("a,b", ";")).toBe("a,b") // comma doesn't need quoting with ; delimiter
  })

  test("empty string returns empty string", () => {
    expect(escapeField("", ",")).toBe("")
  })
})
