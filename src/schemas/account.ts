import {z} from "zod"

import {accountCategories, accountTypes} from "~/db/schema"

const accountIdSchema = z.coerce.number().int().positive()

const accountDetailsSchema = z.object({
    category: z.enum(accountCategories),
    name: z.string().trim().min(1).max(100),
    type: z.enum(accountTypes),
})

export const accountActionSchema = z.discriminatedUnion("intent", [
    accountDetailsSchema.extend({intent: z.literal("create")}),
    accountDetailsSchema.extend({
        id: accountIdSchema,
        intent: z.literal("update"),
    }),
    z.object({id: accountIdSchema, intent: z.literal("archive")}),
    z.object({id: accountIdSchema, intent: z.literal("unarchive")}),
    z.object({id: accountIdSchema, intent: z.literal("delete")}),
])
