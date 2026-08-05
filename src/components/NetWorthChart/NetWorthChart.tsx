import {useState} from "react"
import {CartesianGrid, Line, LineChart, XAxis, YAxis} from "recharts"

import {Button} from "~/components/ui/button"
import {
    type ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "~/components/ui/chart"
import {defaultWindows} from "~/db/schema"
import {type FinanceSnapshot, getSnapshotWindow} from "~/utils/finance"
import {
    formatChartDate,
    formatCompactMoney,
    formatDate,
    formatMoney,
} from "~/utils/format"

const chartConfig = {
    assetsCents: {
        color: "oklch(0.627 0.194 149.214)",
        label: "Assets",
    },
    liabilitiesCents: {
        color: "oklch(0.645 0.246 16.439)",
        label: "Liabilities",
    },
    netWorthCents: {
        color: "var(--foreground)",
        label: "Net worth",
    },
} satisfies ChartConfig

type HistoryWindow = (typeof defaultWindows)[number] | "all"

const historyWindows: HistoryWindow[] = [...defaultWindows, "all"]

type NetWorthChartProps = {
    defaultWindow: number
    snapshots: FinanceSnapshot[]
}

const NetWorthChart = ({defaultWindow, snapshots}: NetWorthChartProps) => {
    const initialWindow =
        defaultWindows.find(window => window === defaultWindow) ?? 52
    const [window, setWindow] = useState<HistoryWindow>(initialWindow)
    const visibleSnapshots = getSnapshotWindow(snapshots, window)

    return (
        <>
            <div
                aria-label="History range"
                className="mb-4 flex justify-end"
                role="group"
            >
                {historyWindows.map(historyWindow => {
                    const isSelected = window === historyWindow
                    const label =
                        historyWindow === "all" ? "All" : `${historyWindow}W`

                    return (
                        <Button
                            key={historyWindow}
                            aria-label={
                                historyWindow === "all"
                                    ? "Show all history"
                                    : `Show ${historyWindow} weeks`
                            }
                            aria-pressed={isSelected}
                            className="-ml-px rounded-none first:ml-0 first:rounded-l-lg last:rounded-r-lg"
                            size="sm"
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => setWindow(historyWindow)}
                        >
                            {label}
                        </Button>
                    )
                })}
            </div>

            <ChartContainer
                aria-label="Assets, liabilities, and net worth over time"
                className="h-80 w-full sm:h-96"
                config={chartConfig}
                role="img"
            >
                <LineChart
                    accessibilityLayer
                    data={visibleSnapshots}
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
                        tickFormatter={formatCompactMoney}
                        tickLine={false}
                        tickMargin={8}
                        width={64}
                    />
                    <ChartTooltip
                        content={
                            <ChartTooltipContent
                                formatter={(value, name) => (
                                    <>
                                        <span className="text-muted-foreground">
                                            {chartConfig[
                                                name as keyof typeof chartConfig
                                            ]?.label ?? name}
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
                    <ChartLegend
                        content={<ChartLegendContent />}
                        verticalAlign="top"
                    />
                    <Line
                        dataKey="assetsCents"
                        dot={false}
                        stroke="var(--color-assetsCents)"
                        strokeWidth={2}
                        type="linear"
                    />
                    <Line
                        dataKey="liabilitiesCents"
                        dot={false}
                        stroke="var(--color-liabilitiesCents)"
                        strokeWidth={2}
                        type="linear"
                    />
                    <Line
                        dataKey="netWorthCents"
                        dot={false}
                        stroke="var(--color-netWorthCents)"
                        strokeWidth={2.5}
                        type="linear"
                    />
                </LineChart>
            </ChartContainer>
        </>
    )
}

export {NetWorthChart}
