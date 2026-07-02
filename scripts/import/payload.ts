import type {AccountInput, SettingsInput} from "~/db/queries"

import {assertHeaders, normalizeDate, parseMoney} from "./utils.ts"

export type ImportedBalance = {
    accountName: string
    amountCents: number
    date: string
}

export type ImportPayload = {
    accounts: AccountInput[]
    balances: ImportedBalance[]
    settings: SettingsInput
}

type CsvRow = Record<string, string>

const defaultSettings = {
    defaultWindow: 52,
    excessInvestPct: 75,
    excessSavePct: 25,
} satisfies Pick<
    SettingsInput,
    "defaultWindow" | "excessInvestPct" | "excessSavePct"
>

export const accountInputs = [
    {
        archived: false,
        category: "credit",
        name: "NFCU",
        sortOrder: 10,
        type: "liability",
    },
    {
        archived: false,
        category: "credit",
        name: "Apple",
        sortOrder: 20,
        type: "liability",
    },
    {
        archived: false,
        category: "cash",
        name: "Checking",
        sortOrder: 30,
        type: "asset",
    },
    {
        archived: false,
        category: "savings",
        name: "Emergency",
        sortOrder: 40,
        type: "asset",
    },
    {
        archived: false,
        category: "savings",
        name: "Savings",
        sortOrder: 50,
        type: "asset",
    },
    {
        archived: false,
        category: "retirement",
        name: "401k",
        sortOrder: 60,
        type: "asset",
    },
    {
        archived: false,
        category: "investment",
        name: "HSA",
        sortOrder: 70,
        type: "asset",
    },
    {
        archived: false,
        category: "investment",
        name: "Investment",
        sortOrder: 80,
        type: "asset",
    },
    {
        archived: false,
        category: "mortgage",
        name: "Mortgage",
        sortOrder: 90,
        type: "liability",
    },
] satisfies AccountInput[]

export const expectedBalanceHeaders = [
    "Date",
    ...accountInputs.map(account => account.name),
]

export const expectedConstantsHeaders = ["Account", "Baseline"]

export const buildImportPayload = (
    balanceRows: CsvRow[],
    balanceHeaders: string[],
    constantsRows: CsvRow[],
    constantsHeaders: string[],
): ImportPayload => {
    assertHeaders(balanceHeaders, expectedBalanceHeaders)
    assertHeaders(constantsHeaders, expectedConstantsHeaders)

    return {
        accounts: accountInputs,
        balances: parseBalances(balanceRows),
        settings: parseSettings(constantsRows),
    }
}

const parseBalances = (rows: CsvRow[]) => {
    const balances: ImportedBalance[] = []

    for (const row of rows) {
        const date = normalizeDate(row.Date ?? "")
        const nfcuCents = parseMoney(row.NFCU ?? "")
        const appleCents = parseMoney(row.Apple ?? "")
        const checkingCents = parseRequiredMoney(row.Checking ?? "", "Checking")
        const transformedCheckingCents =
            checkingCents + (nfcuCents ?? 0) + (appleCents ?? 0)

        for (const account of accountInputs) {
            const amountCents =
                account.name === "Checking"
                    ? transformedCheckingCents
                    : parseMoney(row[account.name] ?? "")

            if (account.category === "credit" && amountCents === null) {
                continue
            }

            if (amountCents === null) {
                throw new Error(`Missing ${account.name} balance for ${date}.`)
            }

            balances.push({
                accountName: account.name,
                amountCents,
                date,
            })
        }
    }

    return balances
}

const parseSettings = (rows: CsvRow[]): SettingsInput => {
    const checking = rows.find(row => row.Account === "Checking")
    const savings = rows.find(row => row.Account === "Savings")

    return {
        checkingBaselineCents: parseRequiredMoney(
            checking?.Baseline ?? "",
            "Checking baseline",
        ),
        emergencyBaselineCents: parseRequiredMoney(
            savings?.Baseline ?? "",
            "Emergency baseline",
        ),
        ...defaultSettings,
    }
}

const parseRequiredMoney = (value: string, label: string) => {
    const amountCents = parseMoney(value)

    if (amountCents === null) {
        throw new Error(`Missing ${label}.`)
    }

    return amountCents
}
