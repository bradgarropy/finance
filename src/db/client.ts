import {drizzle} from "drizzle-orm/d1"

import * as schema from "~/db/schema"

export const db = (env: Env) => {
    return drizzle(env.DB, {schema})
}

export type Database = ReturnType<typeof db>
