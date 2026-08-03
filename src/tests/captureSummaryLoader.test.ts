import {beforeEach, expect, test, vi} from "vitest"

const {database, getBalancesByDate, getDatabase, getSettings} = vi.hoisted(
    () => ({
        database: {},
        getBalancesByDate: vi.fn(),
        getDatabase: vi.fn(),
        getSettings: vi.fn(),
    }),
)

vi.mock("~/db/client", () => ({getDatabase}))
vi.mock("~/db/queries", () => ({getBalancesByDate, getSettings}))

import {loader} from "~/routes/capture-summary"

const balances = [
    {
        accountCategory: "cash" as const,
        accountId: 1,
        accountName: "Checking",
        accountSortOrder: 10,
        accountType: "asset" as const,
        amountCents: 2_500_000,
        date: "2026-07-27",
        id: 1,
    },
    {
        accountCategory: "credit" as const,
        accountId: 2,
        accountName: "NFCU",
        accountSortOrder: 20,
        accountType: "liability" as const,
        amountCents: 100_000,
        date: "2026-07-27",
        id: 2,
    },
]

const settings = {
    checkingBaselineCents: 2_000_000,
    defaultWindow: 52 as const,
    emergencyBaselineCents: 6_000_000,
    excessInvestPct: 75,
    excessSavePct: 25,
    id: 1,
}

beforeEach(() => {
    vi.clearAllMocks()
    getDatabase.mockReturnValue(database)
    getBalancesByDate.mockResolvedValue(balances)
    getSettings.mockResolvedValue(settings)
})

test("loads a capture and derives its financial summary", async () => {
    const result = await loader({
        context: {cloudflare: {env: {}}},
        params: {date: "2026-07-27"},
        request: new Request("http://localhost/capture/2026-07-27"),
    } as Parameters<typeof loader>[0])

    expect(getDatabase).toHaveBeenCalledOnce()
    expect(getBalancesByDate).toHaveBeenCalledWith(database, "2026-07-27")
    expect(getSettings).toHaveBeenCalledWith(database)
    expect(result).toEqual({
        balances,
        date: "2026-07-27",
        settings,
        summary: {
            assetsCents: 2_500_000,
            availableCheckingCents: 2_400_000,
            checkingCents: 2_500_000,
            investmentsSavedCents: 300_000,
            liabilitiesCents: 100_000,
            netWorthCents: 2_400_000,
            savingsSavedCents: 100_000,
            spendingCents: 100_000,
            totalSavedCents: 400_000,
        },
    })
})

test("rejects an invalid capture date before querying D1", async () => {
    await expect(
        loader({
            context: {cloudflare: {env: {}}},
            params: {date: "July 27"},
            request: new Request("http://localhost/capture/July%2027"),
        } as Parameters<typeof loader>[0]),
    ).rejects.toMatchObject({init: {status: 400}})

    expect(getDatabase).not.toHaveBeenCalled()
})

test("returns not found when a date has no balances", async () => {
    getBalancesByDate.mockResolvedValue([])

    await expect(
        loader({
            context: {cloudflare: {env: {}}},
            params: {date: "2026-07-28"},
            request: new Request("http://localhost/capture/2026-07-28"),
        } as Parameters<typeof loader>[0]),
    ).rejects.toMatchObject({init: {status: 404}})
})
