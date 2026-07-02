import {existsSync} from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"

import type {AccountInput} from "~/db/queries"

import {
    assertHeaders,
    normalizeDate,
    parseMoney,
    readCsv,
    readHeaders,
} from "./utils.ts"

type Args = {
    balances?: string
    constants?: string
}

const accountInputs = [
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

const expectedBalanceHeaders = [
    "Date",
    ...accountInputs.map(account => account.name),
]

type BalanceSummary = {
    balanceRows: number
    blankCardCells: number
    columns: number
    endDate: string
    explicitZeroCardCells: number
    headers: string[]
    rows: number
    startDate: string
}

type ConstantsSummary = {
    checkingBaselineCents: number
    columns: number
    emergencyBaselineCents: number
    headers: string[]
    rows: number
}

const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
)

const parseArgs = (argv: string[]): Args => {
    const args: Args = {}

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]

        if (arg === "--balances") {
            args.balances = argv[index + 1]
            index += 1
            continue
        }

        if (arg === "--constants") {
            args.constants = argv[index + 1]
            index += 1
        }
    }

    return args
}

const assertRequiredPath = (label: string, value?: string) => {
    if (!value) {
        throw new Error(`Missing required --${label} path.`)
    }

    const resolved = path.resolve(value)

    if (!existsSync(resolved)) {
        throw new Error(`The --${label} file does not exist: ${resolved}`)
    }

    const relative = path.relative(repoRoot, resolved)

    if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
        throw new Error(
            `The --${label} file must live outside the repository: ${resolved}`,
        )
    }

    return resolved
}

const summarizeBalances = (filePath: string): BalanceSummary => {
    const headers = readHeaders(filePath)
    const rows = readCsv(filePath)

    assertHeaders(headers, expectedBalanceHeaders)

    let balanceRows = 0
    let blankCardCells = 0
    let explicitZeroCardCells = 0
    const dates: string[] = []

    for (const row of rows) {
        dates.push(normalizeDate(row.Date ?? ""))

        for (const account of accountInputs) {
            const rawValue = row[account.name] ?? ""
            const amountCents = parseMoney(rawValue)

            if (account.category === "credit" && amountCents === null) {
                blankCardCells += 1
                continue
            }

            if (account.category === "credit" && amountCents === 0) {
                explicitZeroCardCells += 1
            }

            if (amountCents !== null) {
                balanceRows += 1
            }
        }
    }

    return {
        balanceRows,
        blankCardCells,
        columns: headers.length,
        endDate: dates.at(-1) ?? "",
        explicitZeroCardCells,
        headers,
        rows: rows.length,
        startDate: dates[0] ?? "",
    }
}

const summarizeConstants = (filePath: string): ConstantsSummary => {
    const headers = readHeaders(filePath)
    const rows = readCsv(filePath)
    const checking = rows.find(row => row.Account === "Checking")
    const savings = rows.find(row => row.Account === "Savings")
    const checkingBaselineCents = parseMoney(checking?.Baseline ?? "")
    const emergencyBaselineCents = parseMoney(savings?.Baseline ?? "")

    if (checkingBaselineCents === null) {
        throw new Error("Missing Checking baseline.")
    }

    if (emergencyBaselineCents === null) {
        throw new Error("Missing Emergency baseline from Savings row.")
    }

    return {
        checkingBaselineCents,
        columns: headers.length,
        emergencyBaselineCents,
        headers,
        rows: rows.length,
    }
}

const main = () => {
    const args = parseArgs(process.argv.slice(2))
    const balancesPath = assertRequiredPath("balances", args.balances)
    const constantsPath = assertRequiredPath("constants", args.constants)

    const balances = summarizeBalances(balancesPath)
    const constants = summarizeConstants(constantsPath)

    console.log("Import dry run")
    console.log(`Balances: ${path.basename(balancesPath)}`)
    console.log(`  rows: ${balances.rows}`)
    console.log(`  columns: ${balances.columns}`)
    console.log(`  headers: ${balances.headers.join(", ")}`)
    console.log(`  date range: ${balances.startDate} to ${balances.endDate}`)
    console.log(`  balance rows parsed: ${balances.balanceRows}`)
    console.log(`  blank card cells skipped: ${balances.blankCardCells}`)
    console.log(`  explicit zero card cells: ${balances.explicitZeroCardCells}`)
    console.log(`Constants: ${path.basename(constantsPath)}`)
    console.log(`  rows: ${constants.rows}`)
    console.log(`  columns: ${constants.columns}`)
    console.log(`  headers: ${constants.headers.join(", ")}`)
    console.log("  checking baseline: present")
    console.log("  emergency baseline: present")
    console.log(`Accounts: ${accountInputs.length} matched`)
}

main()
