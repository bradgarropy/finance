import {
    type Column,
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from "@tanstack/react-table"
import {ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon} from "lucide-react"
import {useState} from "react"

import {Button} from "~/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table"
import type {Balance} from "~/db/queries"
import {formatDate, formatMoneyParts} from "~/utils/format"

type BalanceTableProps = {
    balances: Balance[]
}

type SortableHeaderProps = {
    align?: "left" | "right"
    column: Column<Balance>
    label: string
}

const SortableHeader = ({
    align = "left",
    column,
    label,
}: SortableHeaderProps) => {
    const sorted = column.getIsSorted()
    const SortIcon =
        sorted === "asc"
            ? ArrowUpIcon
            : sorted === "desc"
              ? ArrowDownIcon
              : ArrowUpDownIcon

    return (
        <div className={align === "right" ? "flex justify-end" : undefined}>
            <Button
                aria-label={`Sort by ${label.toLowerCase()}`}
                className={align === "right" ? "-mr-2" : "-ml-2"}
                size="sm"
                title={`Sort by ${label.toLowerCase()}`}
                type="button"
                variant="ghost"
                onClick={() => column.toggleSorting(sorted === "asc")}
            >
                {label}
                <SortIcon />
            </Button>
        </div>
    )
}

const columns: ColumnDef<Balance>[] = [
    {
        accessorKey: "date",
        header: ({column}) => <SortableHeader column={column} label="Date" />,
        cell: ({row}) => (
            <time dateTime={row.original.date}>
                {formatDate(row.original.date)}
            </time>
        ),
    },
    {
        accessorKey: "amountCents",
        header: ({column}) => (
            <SortableHeader align="right" column={column} label="Balance" />
        ),
        cell: ({row}) => {
            const money = formatMoneyParts(row.original.amountCents)

            return (
                <div className="text-right">
                    <span className="inline-grid w-32 grid-cols-[1rem_1fr] tabular-nums">
                        <span className="text-left">{money.currency}</span>
                        <span className="text-right">{money.amount}</span>
                    </span>
                </div>
            )
        },
    },
]

const BalanceTable = ({balances}: BalanceTableProps) => {
    const [sorting, setSorting] = useState<SortingState>([
        {desc: true, id: "date"},
    ])
    const table = useReactTable({
        columns,
        data: balances,
        getCoreRowModel: getCoreRowModel(),
        getRowId: row => String(row.id),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: {sorting},
    })

    return (
        <Table>
            <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map(header => {
                            const sorted = header.column.getIsSorted()

                            return (
                                <TableHead
                                    key={header.id}
                                    aria-sort={
                                        sorted === "asc"
                                            ? "ascending"
                                            : sorted === "desc"
                                              ? "descending"
                                              : "none"
                                    }
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext(),
                                          )}
                                </TableHead>
                            )
                        })}
                    </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows.map(row => (
                    <TableRow key={row.id}>
                        {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id}>
                                {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                )}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export {BalanceTable}
