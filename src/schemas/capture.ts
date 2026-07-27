import {z} from "zod"

const balanceSchema = z.object({
    accountId: z.number().int().positive(),
    amountCents: z.number().int().nonnegative(),
})

export const captureSchema = z.object({
    balances: z
        .array(balanceSchema)
        .min(1)
        .superRefine((balances, context) => {
            const accountIds = new Set<number>()

            balances.forEach((balance, index) => {
                if (accountIds.has(balance.accountId)) {
                    context.addIssue({
                        code: "custom",
                        message: "Account IDs must be unique.",
                        path: [index, "accountId"],
                    })
                }

                accountIds.add(balance.accountId)
            })
        }),
    date: z.iso.date(),
})
