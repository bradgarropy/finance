import {useState} from "react"
import {CartesianGrid, Line, LineChart, XAxis, YAxis} from "recharts"

import {
    ChartRangePicker,
    type HistoryWindow,
} from "~/components/ChartRangePicker"
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
        color: "var(--financial-positive)",
        label: "Assets",
    },
    liabilitiesCents: {
        color: "var(--financial-negative)",
        label: "Liabilities",
    },
    netWorthCents: {
        color: "var(--foreground)",
        label: "Net worth",
    },
} satisfies ChartConfig

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
            <div className="mb-4">
                <ChartRangePicker value={window} onValueChange={setWindow} />
            </div>

            <ChartContainer
                aria-label="Assets, liabilities, and net worth over time"
                className="h-64 min-w-0 w-full sm:h-96"
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
                        width={52}
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
