import {Button} from "~/components/ui/button"
import {defaultWindows} from "~/db/schema"

export type HistoryWindow = (typeof defaultWindows)[number] | "all"

const historyWindows: HistoryWindow[] = [...defaultWindows, "all"]

type ChartRangePickerProps = {
    value: HistoryWindow
    onValueChange: (value: HistoryWindow) => void
}

const ChartRangePicker = ({value, onValueChange}: ChartRangePickerProps) => {
    return (
        <div
            aria-label="History range"
            className="flex max-w-full justify-start overflow-x-auto sm:justify-end"
            role="group"
        >
            {historyWindows.map(historyWindow => {
                const isSelected = value === historyWindow
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
                        onClick={() => onValueChange(historyWindow)}
                    >
                        {label}
                    </Button>
                )
            })}
        </div>
    )
}

export {ChartRangePicker}
