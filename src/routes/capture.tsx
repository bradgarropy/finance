import {Field} from "@base-ui/react/field"

import {formatDateInput} from "~/utils/format"

const Route = () => {
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
    }

    return (
        <>
            <title>💵 finance | capture</title>

            <main className="mx-auto flex w-full max-w-xl flex-col gap-10 py-8 sm:py-16">
                <div
                    aria-label="Capture progress"
                    className="flex items-center gap-3"
                >
                    <span className="text-sm font-medium text-neutral-600">
                        Date
                    </span>

                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200">
                        <div className="h-full w-[10%] rounded-full bg-black" />
                    </div>

                    <span className="text-sm tabular-nums text-neutral-500">
                        1 of 10
                    </span>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-bold">
                        When are these balances from?
                    </h1>

                    <p className="max-w-md text-base leading-7 text-neutral-600">
                        Choose the date that best represents this financial
                        snapshot.
                    </p>
                </div>

                <form className="space-y-8" onSubmit={handleSubmit}>
                    <Field.Root className="space-y-2" name="date">
                        <Field.Label className="block text-sm font-medium">
                            Balance date
                        </Field.Label>

                        <Field.Control
                            required
                            type="date"
                            defaultValue={formatDateInput(new Date())}
                            className="h-14 w-full rounded-md border border-neutral-300 bg-white px-4 text-lg tabular-nums shadow-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                        />

                        <Field.Error
                            className="text-sm text-red-600"
                            match="valueMissing"
                        >
                            Choose a balance date.
                        </Field.Error>
                    </Field.Root>

                    <button
                        type="submit"
                        className="flex h-12 w-full items-center justify-center rounded-md bg-black px-5 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        Begin capture
                    </button>
                </form>
            </main>
        </>
    )
}

export default Route
