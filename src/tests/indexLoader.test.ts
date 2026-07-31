import {beforeEach, expect, test, vi} from "vitest"

const {database, getAllBalances, getDatabase} = vi.hoisted(() => ({
    database: {},
    getAllBalances: vi.fn(),
    getDatabase: vi.fn(),
}))

vi.mock("~/db/client", () => ({getDatabase}))
vi.mock("~/db/queries", () => ({getAllBalances}))

import {loader} from "~/routes/index"

beforeEach(() => {
    vi.clearAllMocks()
    getDatabase.mockReturnValue(database)
})

test("loads balance history and derives financial snapshots", async () => {
    getAllBalances.mockResolvedValue([
        {accountType: "asset", amountCents: 125_000, date: "2026-07-31"},
        {accountType: "liability", amountCents: 20_000, date: "2026-07-31"},
    ])

    const result = await loader({
        context: {cloudflare: {env: {}}},
        params: {},
        request: new Request("http://localhost/"),
    } as Parameters<typeof loader>[0])

    expect(getDatabase).toHaveBeenCalledOnce()
    expect(getAllBalances).toHaveBeenCalledWith(database)
    expect(result).toEqual({
        snapshots: [
            {
                assetsCents: 125_000,
                date: "2026-07-31",
                liabilitiesCents: 20_000,
                netWorthCents: 105_000,
            },
        ],
    })
})
