import {NavLink} from "react-router"

const Navigation = () => {
    return (
        <nav className="flex gap-4 font-bold">
            <NavLink to="/" prefetch="intent">
                Home
            </NavLink>

            <NavLink to="/accounts" prefetch="intent">
                Accounts
            </NavLink>

            <NavLink to="/capture" prefetch="intent">
                Capture
            </NavLink>
        </nav>
    )
}

export default Navigation
