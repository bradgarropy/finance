import {format, parseISO} from "date-fns"
import {CalendarIcon} from "lucide-react"
import {useState} from "react"

import {Button} from "~/components/ui/button"
import {Calendar} from "~/components/ui/calendar"
import {Popover, PopoverContent, PopoverTrigger} from "~/components/ui/popover"
import {formatDate} from "~/utils/format"

type DateInputProps = {
    "aria-labelledby"?: string
    "onValueChange": (value: string) => void
    "value": string
}

const DateInput = ({
    "aria-labelledby": ariaLabelledBy,
    onValueChange,
    value,
}: DateInputProps) => {
    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        aria-labelledby={ariaLabelledBy}
                        size="lg"
                        type="button"
                        variant="outline"
                        className="h-14 w-full justify-between px-4 text-right text-lg font-normal tabular-nums"
                    />
                }
            >
                <CalendarIcon />
                <span className="ml-auto">{formatDate(value)}</span>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                    required
                    defaultMonth={parseISO(value)}
                    mode="single"
                    selected={parseISO(value)}
                    onSelect={selectedDate => {
                        onValueChange(format(selectedDate, "yyyy-MM-dd"))
                        setOpen(false)
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}

export default DateInput
