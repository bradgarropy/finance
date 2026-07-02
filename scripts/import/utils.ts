import {readFileSync} from "node:fs"

import {parse} from "csv-parse/sync"

export type CsvRow = Record<string, string>

export const readCsv = (filePath: string) => {
    const contents = readFileSync(filePath, "utf8")

    return parse(contents, {
        bom: true,
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as CsvRow[]
}

export const readHeaders = (filePath: string) => {
    const contents = readFileSync(filePath, "utf8")
    const [headers = []] = parse(contents, {
        bom: true,
        to_line: 1,
        trim: true,
    }) as string[][]

    return headers
}

export const parseMoney = (value: string) => {
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

export const normalizeDate = (value: string) => {
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

export const assertHeaders = (actual: string[], expected: string[]) => {
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
