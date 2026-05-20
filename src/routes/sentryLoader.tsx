export const loader = () => {
    throw new Error("Sentry Loader Error")
}

const Route = () => {
    return (
        <>
            <title>💵 finance | sentry</title>
            <h2 className="text-2xl font-bold">Sentry | Loader Error</h2>
        </>
    )
}

export default Route
