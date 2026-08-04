import {beforeEach, expect, test, vi} from "vitest"

const {database, getDatabase, getSettings} = vi.hoisted(() => ({
    database: {},
    getDatabase: vi.fn(),
    getSettings: vi.fn(),
}))

vi.mock("~/db/client", () => ({getDatabase}))
vi.mock("~/db/queries", () => ({getSettings, setSettings: vi.fn()}))

import {loader} from "~/routes/settings"

const settings = {
    checkingBaselineCents: 2_000_000,
    defaultWindow: 52,
    emergencyBaselineCents: 6_000_000,
    excessInvestPct: 75,
    excessSavePct: 25,
    id: 1,
}

const callLoader = () => {
    return loader({
        context: {cloudflare: {env: {}}},
        params: {},
        request: new Request("http://localhost/settings"),
    } as Parameters<typeof loader>[0])
}

beforeEach(() => {
    vi.clearAllMocks()
    getDatabase.mockReturnValue(database)
    getSettings.mockResolvedValue(settings)
})

test("loads the app settings", async () => {
    await expect(callLoader()).resolves.toEqual({settings})
    expect(getSettings).toHaveBeenCalledWith(database)
})

test("fails clearly when settings are not configured", async () => {
    getSettings.mockResolvedValue(null)

    await expect(callLoader()).rejects.toMatchObject({init: {status: 500}})
})
