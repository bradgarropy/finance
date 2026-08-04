import type {RouteConfig} from "@react-router/dev/routes"
import {index, route} from "@react-router/dev/routes"

const routes: RouteConfig = [
    index("./routes/index.tsx"),
    route("accounts", "./routes/accounts.tsx"),
    route("account/:accountId", "./routes/account-summary.tsx"),
    route("capture", "./routes/capture.tsx"),
    route("capture/:date", "./routes/capture-summary.tsx"),
    route("api/hello", "./routes/api/hello.tsx"),
]

export default routes
