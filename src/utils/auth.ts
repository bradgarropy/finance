import type {JWTPayload} from "jose"
import {createRemoteJWKSet, jwtVerify} from "jose"

type RequireUserOptions = {
    // Override dev-mode detection. Defaults to import.meta.env.DEV.
    dev?: boolean
}

// Cache one remote JWKS per team domain so keys are reused across requests.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

const getJwks = (teamDomain: string) => {
    const cached = jwksCache.get(teamDomain)

    if (cached) {
        return cached
    }

    const url = new URL("/cdn-cgi/access/certs", teamDomain)
    const jwks = createRemoteJWKSet(url)
    jwksCache.set(teamDomain, jwks)
    return jwks
}

// Test-only: clear the cached JWKS instances.
const resetJwksCache = () => {
    jwksCache.clear()
}

// Cloudflare Access provides the signed token in a request header, and also in
// the CF_Authorization cookie as a fallback.
const getAccessToken = (request: Request) => {
    const header = request.headers.get("Cf-Access-Jwt-Assertion")

    if (header) {
        return header
    }

    const cookie = request.headers.get("Cookie") ?? ""
    const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)
    return match ? match[1] : null
}

// Cryptographically verify the Access JWT: signature against the team JWKS,
// plus issuer (team domain) and audience (application AUD tag) and expiry.
const verifyAccessToken = async (
    token: string,
    config: {teamDomain: string; aud: string},
): Promise<JWTPayload> => {
    const jwks = getJwks(config.teamDomain)

    const {payload} = await jwtVerify(token, jwks, {
        issuer: config.teamDomain,
        audience: config.aud,
    })

    return payload
}

const forbidden = () => new Response("Forbidden", {status: 403})

// Guard for loaders/actions. Returns the verified email on success, otherwise
// throws a 403 Response. The Cf-Access-Authenticated-User-Email header is never
// trusted on its own - identity comes only from the verified JWT.
const requireUser = async (
    request: Request,
    env: Env,
    options: RequireUserOptions = {},
): Promise<string> => {
    const dev = options.dev ?? import.meta.env.DEV

    // Local dev has no Access proxy in front, so there is no JWT to verify.
    if (dev) {
        return env.ACCESS_ALLOWED_EMAIL
    }

    // Fail closed if Access config is missing (e.g. AUD not yet set).
    if (
        !env.ACCESS_TEAM_DOMAIN ||
        !env.ACCESS_AUD ||
        !env.ACCESS_ALLOWED_EMAIL
    ) {
        throw forbidden()
    }

    const token = getAccessToken(request)

    if (!token) {
        throw forbidden()
    }

    let payload: JWTPayload

    try {
        payload = await verifyAccessToken(token, {
            teamDomain: env.ACCESS_TEAM_DOMAIN,
            aud: env.ACCESS_AUD,
        })
    } catch {
        throw forbidden()
    }

    const email = typeof payload.email === "string" ? payload.email : ""

    if (email.toLowerCase() !== env.ACCESS_ALLOWED_EMAIL.toLowerCase()) {
        throw forbidden()
    }

    return email
}

export {getAccessToken, requireUser, resetJwksCache, verifyAccessToken}
