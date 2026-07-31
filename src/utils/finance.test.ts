import {expect, test} from "vitest"

import {calculateSnapshot, calculateSnapshotSeries} from "~/utils/finance"

test("calculates assets, liabilities, and net worth from positive balances", () => {
    const snapshot = calculateSnapshot("2026-07-31", [
        {accountType: "asset", amountCents: 100_000, date: "2026-07-31"},
        {accountType: "asset", amountCents: 50_000, date: "2026-07-31"},
        {
            accountType: "liability",
            amountCents: 20_000,
            date: "2026-07-31",
        },
    ])

    expect(snapshot).toEqual({
        assetsCents: 150_000,
        date: "2026-07-31",
        liabilitiesCents: 20_000,
        netWorthCents: 130_000,
    })
})

test("returns zero totals for an empty snapshot", () => {
    expect(calculateSnapshot("2026-07-31", [])).toEqual({
        assetsCents: 0,
        date: "2026-07-31",
        liabilitiesCents: 0,
        netWorthCents: 0,
    })
})

test("groups balances into a chronological snapshot series", () => {
    const series = calculateSnapshotSeries([
        {accountType: "asset", amountCents: 80_000, date: "2026-07-31"},
        {accountType: "asset", amountCents: 50_000, date: "2026-07-24"},
        {
            accountType: "liability",
            amountCents: 10_000,
            date: "2026-07-31",
        },
        {
            accountType: "liability",
            amountCents: 20_000,
            date: "2026-07-24",
        },
    ])

    expect(series).toEqual([
        {
            assetsCents: 50_000,
            date: "2026-07-24",
            liabilitiesCents: 20_000,
            netWorthCents: 30_000,
        },
        {
            assetsCents: 80_000,
            date: "2026-07-31",
            liabilitiesCents: 10_000,
            netWorthCents: 70_000,
        },
    ])
})
