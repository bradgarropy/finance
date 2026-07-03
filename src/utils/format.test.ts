import {expect, test} from "vitest"

import {formatDateInput, formatMoney} from "~/utils/format"

test("formats cents as dollars", () => {
    expect(formatMoney(0)).toEqual("$0.00")
    expect(formatMoney(42)).toEqual("$0.42")
    expect(formatMoney(123456)).toEqual("$1,234.56")
})

test("formats negative cents as negative dollars", () => {
    expect(formatMoney(-123456)).toEqual("-$1,234.56")
})

test("formats dates for date inputs in UTC", () => {
    expect(formatDateInput(new Date("2026-07-03T00:00:00.000Z"))).toEqual(
        "2026-07-03",
    )
    expect(formatDateInput(new Date("2026-07-03T23:59:59.999Z"))).toEqual(
        "2026-07-03",
    )
})

test("pads single-digit months and days", () => {
    expect(formatDateInput(new Date("2026-01-05T12:00:00.000Z"))).toEqual(
        "2026-01-05",
    )
})
