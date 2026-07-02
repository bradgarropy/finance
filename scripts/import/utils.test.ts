import {expect, test} from "vitest"

import {assertHeaders, normalizeDate, parseMoney} from "./utils"

test("parses money values as positive cents", () => {
    expect(parseMoney("$1,234.56")).toEqual(123456)
    expect(parseMoney("$\t(181,294.05)")).toEqual(18129405)
    expect(parseMoney("$0.00")).toEqual(0)
    expect(parseMoney("")).toEqual(null)
    expect(parseMoney("   ")).toEqual(null)
})

test("rejects invalid money values", () => {
    expect(() => parseMoney("nope")).toThrow("Invalid money value")
})

test("normalizes spreadsheet dates", () => {
    expect(normalizeDate("3/5/2024")).toEqual("2024-03-05")
    expect(normalizeDate("12/31/2026")).toEqual("2026-12-31")
})

test("rejects invalid spreadsheet dates", () => {
    expect(() => normalizeDate("2024-03-05")).toThrow("Invalid date value")
    expect(() => normalizeDate("2/30/2024")).toThrow("Invalid date value")
    expect(() => normalizeDate("13/1/2024")).toThrow("Invalid date value")
})

test("accepts exact header matches", () => {
    expect(() =>
        assertHeaders(["Date", "Checking"], ["Date", "Checking"]),
    ).not.toThrow()
})

test("rejects changed headers", () => {
    expect(() =>
        assertHeaders(["Date", "Checking"], ["Date", "Savings"]),
    ).toThrow('Expected balance column 2 to be "Savings", received "Checking".')
})
