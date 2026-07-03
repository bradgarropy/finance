import {existsSync, readFileSync, statSync} from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"

import {parse} from "csv-parse/sync"
import {getPlatformProxy} from "wrangler"

import {db} from "~/db/client"
import type {
    Account,
    AccountInput,
    BalanceInput,
    SettingsInput,
} from "~/db/queries"
import {
    getAccounts,
    setSettings,
    upsertAccounts,
    upsertBalances,
} from "~/db/queries"

type Args = {
    dir?: string
    remote: boolean
}

type CsvRow = Record<string, string>

type ImportedBalance = {
    accountName: string
    amountCents: number
    date: string
}

type ImportPayload = {
    accounts: AccountInput[]
    balances: ImportedBalance[]
    settings: SettingsInput
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

const BALANCE_FILE_NAME = "Balances-Raw.csv"
const CONSTANTS_FILE_NAME = "Constants-Baselines.csv"

const defaultSettings = {
    defaultWindow: 52,
    excessInvestPct: 75,
    excessSavePct: 25,
} satisfies Pick<
    SettingsInput,
    "defaultWindow" | "excessInvestPct" | "excessSavePct"
>

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

const expectedConstantsHeaders = ["Account", "Baseline"]

const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
)

const parseArgs = (argv: string[]): Args => {
    const args: Args = {remote: false}

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]

        if (arg === "--remote") {
            args.remote = true
            continue
        }

        if (!args.dir) {
            args.dir = arg
        }
    }

    return args
}

const assertRequiredPath = (label: string, value?: string) => {
    if (!value) {
        throw new Error(`Missing required ${label} path.`)
    }

    const resolved = path.resolve(value)

    if (!existsSync(resolved)) {
        throw new Error(`The ${label} path does not exist: ${resolved}`)
    }

    const relative = path.relative(repoRoot, resolved)

    if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
        throw new Error(
            `The ${label} path must live outside the repository: ${resolved}`,
        )
    }

    return resolved
}

const assertRequiredDirectory = (label: string, value?: string) => {
    const resolved = assertRequiredPath(label, value)

    if (!statSync(resolved).isDirectory()) {
        throw new Error(`The ${label} path must be a directory: ${resolved}`)
    }

    return resolved
}

const getImportPaths = (dir?: string) => {
    const resolvedDir = assertRequiredDirectory("dir", dir)

    return {
        balances: assertRequiredPath(
            "balances",
            path.join(resolvedDir, BALANCE_FILE_NAME),
        ),
        constants: assertRequiredPath(
            "constants",
            path.join(resolvedDir, CONSTANTS_FILE_NAME),
        ),
    }
}

const readCsv = (filePath: string) => {
    const contents = readFileSync(filePath, "utf8")

    return parse(contents, {
        bom: true,
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as CsvRow[]
}

const readHeaders = (filePath: string) => {
    const contents = readFileSync(filePath, "utf8")
    const [headers = []] = parse(contents, {
        bom: true,
        to_line: 1,
        trim: true,
    }) as string[][]

    return headers
}

const parseMoney = (value: string) => {
    const trimmed = value.trim()

    if (!trimmed) {
        return null
    }

    const isParenthesized = trimmed.includes("(") && trimmed.includes(")")
    const normalized = trimmed.replaceAll(/[$,\t\s()]/gu, "")

    if (!normalized) {
        return null
    }

    const amount = Number(normalized)

    if (!Number.isFinite(amount)) {
        throw new Error(`Invalid money value: ${value}`)
    }

    return Math.round(Math.abs(isParenthesized ? -amount : amount) * 100)
}

const normalizeDate = (value: string) => {
    const match = /^(?<month>\d{1,2})\/(?<day>\d{1,2})\/(?<year>\d{4})$/u.exec(
        value.trim(),
    )

    if (!match?.groups) {
        throw new Error(`Invalid date value: ${value}`)
    }

    const month = Number(match.groups.month)
    const day = Number(match.groups.day)
    const year = Number(match.groups.year)

    if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error(`Invalid date value: ${value}`)
    }

    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

    if (!Number.isInteger(day) || day < 1 || day > lastDayOfMonth) {
        throw new Error(`Invalid date value: ${value}`)
    }

    return [
        String(year).padStart(4, "0"),
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0"),
    ].join("-")
}

const assertHeaders = (actual: string[], expected: string[]) => {
    if (actual.length !== expected.length) {
        throw new Error(
            `Expected ${expected.length} balance columns, received ${actual.length}.`,
        )
    }

    for (const [index, expectedHeader] of expected.entries()) {
        const actualHeader = actual[index]

        if (actualHeader !== expectedHeader) {
            throw new Error(
                `Expected balance column ${index + 1} to be "${expectedHeader}", received "${actualHeader}".`,
            )
        }
    }
}

const buildImportPayload = (
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

const groupBalancesByDate = (
    balances: ImportedBalance[],
    accounts: Account[],
) => {
    const accountIdsByName = new Map(
        accounts.map(account => [account.name, account.id]),
    )
    const balancesByDate = new Map<string, BalanceInput[]>()

    for (const balance of balances) {
        const accountId = accountIdsByName.get(balance.accountName)

        if (!accountId) {
            throw new Error(`Missing account id for ${balance.accountName}.`)
        }

        const entries = balancesByDate.get(balance.date) ?? []

        entries.push({
            accountId,
            amountCents: balance.amountCents,
        })

        balancesByDate.set(balance.date, entries)
    }

    return balancesByDate
}

const writeImport = async (
    payload: ImportPayload,
    options: Pick<Args, "remote">,
) => {
    const platform = await getPlatformProxy<Env>({
        remoteBindings: options.remote,
    })

    try {
        const database = db(platform.env)

        await upsertAccounts(database, payload.accounts)
        await setSettings(database, payload.settings)

        const accounts = await getAccounts(database)
        const balancesByDate = groupBalancesByDate(payload.balances, accounts)

        for (const [date, balances] of balancesByDate) {
            await upsertBalances(database, date, balances)
        }
    } finally {
        await platform.dispose()
    }
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
    const {balances: balancesPath, constants: constantsPath} = getImportPaths(
        args.dir,
    )

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
