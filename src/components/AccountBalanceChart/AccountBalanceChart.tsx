import {useState} from "react"
import {CartesianGrid, Line, LineChart, XAxis, YAxis} from "recharts"

import {
    ChartRangePicker,
    type HistoryWindow,
} from "~/components/ChartRangePicker"
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "~/components/ui/chart"
import type {Account, Balance} from "~/db/queries"
import {defaultWindows} from "~/db/schema"
import {
    formatChartDate,
    formatCompactMoney,
    formatDate,
    formatMoney,
} from "~/utils/format"

type AccountBalanceChartProps = {
    accountType: Account["type"]
    balances: Pick<Balance, "amountCents" | "date">[]
    defaultWindow: number
}

const AccountBalanceChart = ({
    accountType,
    balances,
    defaultWindow,
}: AccountBalanceChartProps) => {
    const initialWindow =
        defaultWindows.find(window => window === defaultWindow) ?? 52
    const [window, setWindow] = useState<HistoryWindow>(initialWindow)
    const chronologicalBalances = [...balances].sort((left, right) =>
        left.date.localeCompare(right.date),
    )
    const visibleBalances =
        window === "all"
            ? chronologicalBalances
            : chronologicalBalances.slice(-window)
    const chartConfig = {
        amountCents: {
            color:
                accountType === "asset"
                    ? "var(--financial-positive)"
                    : "var(--financial-negative)",
            label: "Balance",
        },
    } satisfies ChartConfig

    return (
        <div className="min-w-0">
            <div className="mb-4">
                <ChartRangePicker value={window} onValueChange={setWindow} />
            </div>

            <ChartContainer
                aria-label="Account balance over time"
                className="h-64 min-w-0 w-full sm:h-80"
                config={chartConfig}
                role="img"
            >
                <LineChart
                    accessibilityLayer
                    data={visibleBalances}
                    margin={{left: 8, right: 8, top: 8}}
                    style={{cursor: "auto"}}
                >
                    <CartesianGrid vertical={false} />
                    <XAxis
                        axisLine={false}
                        dataKey="date"
                        minTickGap={32}
                        tickFormatter={formatChartDate}
                        tickLine={false}
                        tickMargin={10}
                    />
                    <YAxis
                        axisLine={false}
                        domain={["auto", "auto"]}
                        tickFormatter={formatCompactMoney}
                        tickLine={false}
                        tickMargin={8}
                        width={52}
                    />
                    <ChartTooltip
                        content={
                            <ChartTooltipContent
                                formatter={value => (
                                    <>
                                        <span className="text-muted-foreground">
                                            Balance
                                        </span>
                                        <span className="ml-auto font-mono font-medium text-foreground tabular-nums">
                                            {formatMoney(Number(value))}
                                        </span>
                                    </>
                                )}
                                labelFormatter={(_, payload) => {
                                    const date = payload[0]?.payload?.date

                                    return typeof date === "string"
                                        ? formatDate(date)
                                        : ""
                                }}
                            />
                        }
                    />
                    <Line
                        dataKey="amountCents"
                        dot={false}
                        stroke="var(--color-amountCents)"
                        strokeWidth={2.5}
                        type="linear"
                    />
                </LineChart>
            </ChartContainer>
        </div>
    )
}

export {AccountBalanceChart}
