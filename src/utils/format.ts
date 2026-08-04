const moneyFormatter = new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
})

const dateInputFormatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
})

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
})

export const formatMoney = (amountCents: number) => {
    return moneyFormatter.format(amountCents / 100)
}

export const formatMoneyParts = (amountCents: number) => {
    const parts = moneyFormatter.formatToParts(amountCents / 100)

    return {
        amount: parts
            .filter(part => part.type !== "currency")
            .map(part => part.value)
            .join(""),
        currency: parts.find(part => part.type === "currency")?.value ?? "",
    }
}

export const formatDate = (date: string) => {
    return dateFormatter.format(new Date(`${date}T00:00:00.000Z`))
}

export const formatDateInput = (date: Date) => {
    const parts = new Map(
        dateInputFormatter
            .formatToParts(date)
            .map(part => [part.type, part.value]),
    )

    return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`
}
