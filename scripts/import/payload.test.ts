import {expect, test} from "vitest"

import {
    accountInputs,
    buildImportPayload,
    expectedBalanceHeaders,
    expectedConstantsHeaders,
} from "./payload"

const constantsRows = [
    {Account: "Checking", Baseline: "$20,000.00"},
    {Account: "Savings", Baseline: "$60,000.00"},
]

const balanceRow = {
    "401k": "$7,000.00",
    "Apple": "",
    "Checking": "$1,000.00",
    "Date": "3/15/2024",
    "Emergency": "$4,000.00",
    "HSA": "$6,000.00",
    "Investment": "$8,000.00",
    "Mortgage": "$9,000.00",
    "NFCU": "$100.00",
    "Savings": "$5,000.00",
}

test("builds typed accounts", () => {
    const payload = buildImportPayload(
        [balanceRow],
        expectedBalanceHeaders,
        constantsRows,
        expectedConstantsHeaders,
    )

    expect(payload.accounts).toEqual(accountInputs)
    expect(payload.accounts).toHaveLength(9)
})

test("builds settings with imported baselines and defaults", () => {
    const payload = buildImportPayload(
        [balanceRow],
        expectedBalanceHeaders,
        constantsRows,
        expectedConstantsHeaders,
    )

    expect(payload.settings).toEqual({
        checkingBaselineCents: 2000000,
        defaultWindow: 52,
        emergencyBaselineCents: 6000000,
        excessInvestPct: 75,
        excessSavePct: 25,
    })
})

test("builds balances with checking transformed to pre-payoff", () => {
    const payload = buildImportPayload(
        [balanceRow],
        expectedBalanceHeaders,
        constantsRows,
        expectedConstantsHeaders,
    )

    expect(payload.balances).toContainEqual({
        accountName: "Checking",
        amountCents: 110000,
        date: "2024-03-15",
    })
    expect(payload.balances).toContainEqual({
        accountName: "NFCU",
        amountCents: 10000,
        date: "2024-03-15",
    })
    expect(payload.balances).not.toContainEqual({
        accountName: "Apple",
        amountCents: expect.any(Number) as number,
        date: "2024-03-15",
    })
})

test("imports explicit zero credit card balances", () => {
    const payload = buildImportPayload(
        [{...balanceRow, Apple: "$0.00", NFCU: ""}],
        expectedBalanceHeaders,
        constantsRows,
        expectedConstantsHeaders,
    )

    expect(payload.balances).toContainEqual({
        accountName: "Apple",
        amountCents: 0,
        date: "2024-03-15",
    })
    expect(payload.balances).toContainEqual({
        accountName: "Checking",
        amountCents: 100000,
        date: "2024-03-15",
    })
})
