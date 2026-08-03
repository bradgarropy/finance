import Navigation from "~/components/Navigation"

const Header = () => {
    return (
        <header className="flex flex-col items-start gap-6 px-8 py-8 sm:flex-row sm:items-center sm:justify-between sm:py-12">
            <h1 className="text-3xl font-bold">finance</h1>
            <Navigation />
        </header>
    )
}

export default Header
