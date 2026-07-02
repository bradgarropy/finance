import {existsSync, readFileSync} from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"

import type {AccountInput} from "~/db/queries"

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

const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
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

const summarizeCsv = (filePath: string) => {
    const contents = readFileSync(filePath, "utf8")
    const lines = contents.split(/\r?\n/u).filter(line => line.length > 0)
    const headers = lines[0]?.split(",") ?? []

    return {
        columns: headers.length,
        headers,
        rows: Math.max(lines.length - 1, 0),
    }
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

const main = () => {
    const args = parseArgs(process.argv.slice(2))
    const balancesPath = assertRequiredPath("balances", args.balances)
    const constantsPath = assertRequiredPath("constants", args.constants)

    const balances = summarizeCsv(balancesPath)
    const constants = summarizeCsv(constantsPath)

    assertHeaders(balances.headers, expectedBalanceHeaders)

    console.log("Import dry run")
    console.log(`Balances: ${path.basename(balancesPath)}`)
    console.log(`  rows: ${balances.rows}`)
    console.log(`  columns: ${balances.columns}`)
    console.log(`  headers: ${balances.headers.join(", ")}`)
    console.log(`Constants: ${path.basename(constantsPath)}`)
    console.log(`  rows: ${constants.rows}`)
    console.log(`  columns: ${constants.columns}`)
    console.log(`  headers: ${constants.headers.join(", ")}`)
    console.log(`Accounts: ${accountInputs.length} matched`)
}

main()
