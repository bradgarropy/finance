import {beforeEach, expect, test, vi} from "vitest"

const {database, getAccount, getBalancesByAccountId, getDatabase} = vi.hoisted(
    () => ({
        database: {},
        getAccount: vi.fn(),
        getBalancesByAccountId: vi.fn(),
        getDatabase: vi.fn(),
    }),
)

vi.mock("~/db/client", () => ({getDatabase}))
vi.mock("~/db/queries", () => ({getAccount, getBalancesByAccountId}))

import {loader} from "~/routes/account-summary"

const account = {
    archived: false,
    category: "cash" as const,
    id: 1,
    name: "Checking",
    sortOrder: 10,
    type: "asset" as const,
}

const balances = [
    {
        accountId: 1,
        amountCents: 2_000_000,
        date: "2026-08-03",
        id: 1,
    },
]

beforeEach(() => {
    vi.clearAllMocks()
    getDatabase.mockReturnValue(database)
    getAccount.mockResolvedValue(account)
    getBalancesByAccountId.mockResolvedValue(balances)
})

test("loads an account and its balance history", async () => {
    const result = await loader({
        context: {cloudflare: {env: {}}},
        params: {accountId: "1"},
        request: new Request("http://localhost/account/1"),
    } as Parameters<typeof loader>[0])

    expect(getDatabase).toHaveBeenCalledOnce()
    expect(getAccount).toHaveBeenCalledWith(database, 1)
    expect(getBalancesByAccountId).toHaveBeenCalledWith(database, 1)
    expect(result).toEqual({account, balances})
})

test("rejects an invalid account id before querying D1", async () => {
    await expect(
        loader({
            context: {cloudflare: {env: {}}},
            params: {accountId: "checking"},
            request: new Request("http://localhost/account/checking"),
        } as Parameters<typeof loader>[0]),
    ).rejects.toMatchObject({init: {status: 400}})

    expect(getDatabase).not.toHaveBeenCalled()
})

test("returns not found for an unknown account", async () => {
    getAccount.mockResolvedValue(null)

    await expect(
        loader({
            context: {cloudflare: {env: {}}},
            params: {accountId: "99"},
            request: new Request("http://localhost/account/99"),
        } as Parameters<typeof loader>[0]),
    ).rejects.toMatchObject({init: {status: 404}})
})
