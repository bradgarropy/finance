import {NavLink} from "react-router"

const Navigation = () => {
    return (
        <nav className="flex w-full justify-between gap-2 text-sm font-bold sm:w-auto sm:justify-start sm:gap-4 sm:text-base">
            <NavLink to="/" prefetch="intent">
                Overview
            </NavLink>

            <NavLink to="/accounts" prefetch="intent">
                Accounts
            </NavLink>

            <NavLink to="/capture" prefetch="intent">
                Capture
            </NavLink>

            <NavLink to="/settings" prefetch="intent">
                Settings
            </NavLink>
        </nav>
    )
}

export default Navigation
