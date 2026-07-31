import {
    ArchiveIcon,
    ArchiveRestoreIcon,
    EllipsisIcon,
    PencilIcon,
    Trash2Icon,
} from "lucide-react"

import {AccountTypeBadge} from "~/components/AccountTypeBadge"
import {Badge} from "~/components/ui/badge"
import {Button} from "~/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table"
import type {Account} from "~/db/queries"

type AccountListProps = {
    accounts: Account[]
    emptyMessage: string
    onArchive: (account: Account) => void
    onDelete: (account: Account) => void
    onEdit: (account: Account) => void
    title: string
}

const AccountList = ({
    accounts,
    emptyMessage,
    onArchive,
    onDelete,
    onEdit,
    title,
}: AccountListProps) => {
    return (
        <section aria-labelledby={`${title.toLowerCase()}-accounts-heading`}>
            <div className="mb-3 flex items-center gap-2">
                <h2
                    id={`${title.toLowerCase()}-accounts-heading`}
                    className="text-lg font-semibold"
                >
                    {title}
                </h2>

                <span className="text-sm text-muted-foreground">
                    {accounts.length}
                </span>
            </div>

            {accounts.length === 0 ? (
                <p className="border-t py-6 text-sm text-muted-foreground">
                    {emptyMessage}
                </p>
            ) : (
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[34%]">Name</TableHead>
                            <TableHead className="w-[28%]">Type</TableHead>
                            <TableHead className="w-[28%]">Category</TableHead>
                            <TableHead className="w-[10%]">
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {accounts.map(account => (
                            <TableRow key={account.id}>
                                <TableCell className="font-medium">
                                    {account.name}
                                </TableCell>
                                <TableCell>
                                    <AccountTypeBadge type={account.type} />
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className="capitalize"
                                    >
                                        {account.category}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                />
                                            }
                                        >
                                            <EllipsisIcon />
                                            <span className="sr-only">
                                                Actions for {account.name}
                                            </span>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => onEdit(account)}
                                            >
                                                <PencilIcon />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    onArchive(account)
                                                }
                                            >
                                                {account.archived ? (
                                                    <ArchiveRestoreIcon />
                                                ) : (
                                                    <ArchiveIcon />
                                                )}
                                                {account.archived
                                                    ? "Unarchive"
                                                    : "Archive"}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() =>
                                                    onDelete(account)
                                                }
                                            >
                                                <Trash2Icon />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </section>
    )
}

export {AccountList}
