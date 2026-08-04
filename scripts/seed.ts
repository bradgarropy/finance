import {getPlatformProxy} from "wrangler"

import {getDatabase} from "~/db/client"
import {getSettings, setSettings} from "~/db/queries"

const platform = await getPlatformProxy<Env>({remoteBindings: false})

try {
    const db = getDatabase(platform.env)
    const settings = await getSettings(db)

    if (settings) {
        console.log("Local settings are already seeded.")
    } else {
        await setSettings(db, {
            checkingBaselineCents: 2_000_000,
            defaultWindow: 52,
            emergencyBaselineCents: 6_000_000,
            excessInvestPct: 75,
            excessSavePct: 25,
        })

        console.log("Seeded local settings.")
    }
} finally {
    await platform.dispose()
}
