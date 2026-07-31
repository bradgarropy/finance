import {Badge} from "~/components/ui/badge"
import type {Account} from "~/db/queries"
import {cn} from "~/lib/utils"

type AccountTypeBadgeProps = {
    type: Account["type"]
}

const styles: Record<Account["type"], string> = {
    asset: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    liability:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
}

const AccountTypeBadge = ({type}: AccountTypeBadgeProps) => {
    return (
        <Badge variant="outline" className={cn("capitalize", styles[type])}>
            {type}
        </Badge>
    )
}

export {AccountTypeBadge}
