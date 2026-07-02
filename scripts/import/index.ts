import {existsSync} from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"

import type {ImportPayload} from "./payload.ts"
import {buildImportPayload} from "./payload.ts"
import {readCsv, readHeaders} from "./utils.ts"

type Args = {
    balances?: string
    constants?: string
    remote: boolean
}

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
    columns: number
    headers: string[]
    rows: number
}

const moneyFormatter = new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
})

const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
)

const parseArgs = (argv: string[]): Args => {
    const args: Args = {remote: false}

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]

        if (arg === "--remote") {
            args.remote = true
            continue
        }

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

const summarizeBalances = (
    headers: string[],
    rows: ReturnType<typeof readCsv>,
    payload: ImportPayload,
): BalanceSummary => {
    const creditBalances = payload.balances.filter(
        balance =>
            balance.accountName === "NFCU" || balance.accountName === "Apple",
    )
    const explicitZeroCardCells = creditBalances.filter(
        balance => balance.amountCents === 0,
    ).length
    const blankCardCells = rows.length * 2 - creditBalances.length

    return {
        balanceRows: payload.balances.length,
        blankCardCells,
        columns: headers.length,
        endDate: payload.balances.at(-1)?.date ?? "",
        explicitZeroCardCells,
        headers,
        rows: rows.length,
        startDate: payload.balances[0]?.date ?? "",
    }
}

const summarizeConstants = (
    headers: string[],
    rows: ReturnType<typeof readCsv>,
): ConstantsSummary => {
    return {
        columns: headers.length,
        headers,
        rows: rows.length,
    }
}

const formatCents = (cents: number) => moneyFormatter.format(cents / 100)

const getHeading = (args: Args) =>
    args.remote ? "Remote import complete" : "Local import complete"

const main = async () => {
    const args = parseArgs(process.argv.slice(2))
    const balancesPath = assertRequiredPath("balances", args.balances)
    const constantsPath = assertRequiredPath("constants", args.constants)

    const balanceHeaders = readHeaders(balancesPath)
    const balanceRows = readCsv(balancesPath)
    const constantsHeaders = readHeaders(constantsPath)
    const constantsRows = readCsv(constantsPath)
    const payload = buildImportPayload(
        balanceRows,
        balanceHeaders,
        constantsRows,
        constantsHeaders,
    )
    const balances = summarizeBalances(balanceHeaders, balanceRows, payload)
    const constants = summarizeConstants(constantsHeaders, constantsRows)

    const {writeImport} = await import("./database.ts")

    await writeImport(payload, {remote: args.remote})

    console.log(getHeading(args))
    console.log(
        `  balances: ${path.basename(balancesPath)} (${balances.rows} rows)`,
    )
    console.log(
        `  constants: ${path.basename(constantsPath)} (${constants.rows} rows)`,
    )
    console.log(
        `  dates: ${balances.rows} (${balances.startDate} to ${balances.endDate})`,
    )
    console.log(`  accounts: ${payload.accounts.length}`)
    console.log(`  balance entries: ${balances.balanceRows}`)
    console.log(`  skipped blank card cells: ${balances.blankCardCells}`)
    console.log(`  explicit zero card cells: ${balances.explicitZeroCardCells}`)
    console.log(
        `  checking baseline: ${formatCents(payload.settings.checkingBaselineCents)}`,
    )
    console.log(
        `  emergency baseline: ${formatCents(payload.settings.emergencyBaselineCents)}`,
    )
    console.log(
        `  excess split: ${payload.settings.excessInvestPct}/${payload.settings.excessSavePct}`,
    )
    console.log(`  default window: ${payload.settings.defaultWindow} weeks`)
}

await main()
