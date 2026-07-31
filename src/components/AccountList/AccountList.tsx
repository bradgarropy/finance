import {AccountTypeBadge} from "~/components/AccountTypeBadge"
import {Badge} from "~/components/ui/badge"
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
    title: string
}

const AccountList = ({accounts, emptyMessage, title}: AccountListProps) => {
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
                            <TableHead className="w-[30%]">Type</TableHead>
                            <TableHead className="w-[36%]">Category</TableHead>
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
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </section>
    )
}

export {AccountList}
