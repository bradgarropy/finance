import type {RouteConfig} from "@react-router/dev/routes"
import {index, route} from "@react-router/dev/routes"

const routes: RouteConfig = [
    index("./routes/index.tsx"),
    route("accounts", "./routes/accounts.tsx"),
    route("capture", "./routes/capture.tsx"),
    route("api/hello", "./routes/api/hello.tsx"),
]

export default routes
