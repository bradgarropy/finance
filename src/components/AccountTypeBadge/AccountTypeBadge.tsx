import {Badge} from "~/components/ui/badge"
import type {Account} from "~/db/queries"
import {cn} from "~/lib/utils"

type AccountTypeBadgeProps = {
    type: Account["type"]
}

const styles: Record<Account["type"], string> = {
    asset: "border-financial-positive/25 bg-financial-positive/10 text-financial-positive-foreground dark:border-financial-positive/40 dark:bg-financial-positive/15",
    liability:
        "border-financial-negative/25 bg-financial-negative/10 text-financial-negative-foreground dark:border-financial-negative/40 dark:bg-financial-negative/15",
}

const AccountTypeBadge = ({type}: AccountTypeBadgeProps) => {
    return (
        <Badge variant="outline" className={cn("capitalize", styles[type])}>
            {type}
        </Badge>
    )
}

export {AccountTypeBadge}
