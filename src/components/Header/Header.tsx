import Navigation from "~/components/Navigation"

const Header = () => {
    return (
        <header className="flex min-w-0 flex-col items-start gap-5 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-12">
            <h1 className="text-2xl font-bold sm:text-3xl">finance</h1>
            <Navigation />
        </header>
    )
}

export default Header
