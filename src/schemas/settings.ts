import {z} from "zod"

import {defaultWindows} from "~/db/schema"

const moneySchema = z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d{1,2})?$/)
    .transform(value => Math.round(Number(value) * 100))

const percentageSchema = z.coerce.number().int().min(0).max(100)

export const settingsActionSchema = z
    .object({
        checkingBaselineCents: moneySchema,
        defaultWindow: z.coerce
            .number()
            .refine(value => defaultWindows.some(window => window === value)),
        emergencyBaselineCents: moneySchema,
        excessInvestPct: percentageSchema,
        excessSavePct: percentageSchema,
    })
    .superRefine((settings, context) => {
        if (settings.excessInvestPct + settings.excessSavePct !== 100) {
            context.addIssue({
                code: "custom",
                message: "The savings split must total 100%.",
                path: ["excessSavePct"],
            })
        }
    })
