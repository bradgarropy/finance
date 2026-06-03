/// <reference types="vite/client" />
/// <reference types="./worker-configuration.d.ts" />

declare namespace Cloudflare {
    interface Env {
        SENTRY_DSN: string
        ACCESS_TEAM_DOMAIN: string
        ACCESS_AUD: string
        ACCESS_ALLOWED_EMAIL: string
    }
}
