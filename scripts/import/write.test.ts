import {expect, test} from "vitest"

import type {Account} from "~/db/queries"

import {groupBalancesByDate} from "./write"

const accounts = [
    {
        archived: false,
        category: "cash",
        id: 1,
        name: "Checking",
        sortOrder: 10,
        type: "asset",
    },
    {
        archived: false,
        category: "credit",
        id: 2,
        name: "Apple",
        sortOrder: 20,
        type: "liability",
    },
] satisfies Account[]

test("groups imported balances by date with account ids", () => {
    const grouped = groupBalancesByDate(
        [
            {
                accountName: "Checking",
                amountCents: 10000,
                date: "2024-03-15",
            },
            {
                accountName: "Apple",
                amountCents: 2000,
                date: "2024-03-15",
            },
            {
                accountName: "Checking",
                amountCents: 15000,
                date: "2024-03-22",
            },
        ],
        accounts,
    )

    expect([...grouped.entries()]).toEqual([
        [
            "2024-03-15",
            [
                {accountId: 1, amountCents: 10000},
                {accountId: 2, amountCents: 2000},
            ],
        ],
        ["2024-03-22", [{accountId: 1, amountCents: 15000}]],
    ])
})

test("rejects balances for missing accounts", () => {
    expect(() =>
        groupBalancesByDate(
            [
                {
                    accountName: "Missing",
                    amountCents: 10000,
                    date: "2024-03-15",
                },
            ],
            accounts,
        ),
    ).toThrow("Missing account id for Missing.")
})
