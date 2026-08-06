import {Link} from "react-router"

import Navigation from "~/components/Navigation"

const Header = () => {
    return (
        <header className="border-b px-4 sm:px-8">
            <div className="mx-auto flex h-14 w-full max-w-5xl min-w-0 items-center justify-between sm:h-16">
                <Link
                    to="/"
                    className="flex items-center gap-2 text-xl font-[760] text-foreground"
                >
                    <img src="/logo.svg" alt="" className="size-6" />
                    <span>wealth</span>
                </Link>

                <Navigation />
            </div>
        </header>
    )
}

export default Header
