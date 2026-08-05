import {CartesianGrid, Line, LineChart, XAxis, YAxis} from "recharts"

import {
    type ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "~/components/ui/chart"
import type {FinanceSnapshot} from "~/utils/finance"
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

type NetWorthChartProps = {
    snapshots: FinanceSnapshot[]
}

export const NetWorthChart = ({snapshots}: NetWorthChartProps) => {
    return (
        <ChartContainer
            aria-label="Assets, liabilities, and net worth over time"
            className="h-80 w-full sm:h-96"
            config={chartConfig}
            role="img"
        >
            <LineChart
                accessibilityLayer
                data={snapshots}
                margin={{left: 8, right: 8, top: 8}}
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
    )
}
