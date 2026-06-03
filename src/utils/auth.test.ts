// @vitest-environment node

import type {JWK} from "jose"
import {exportJWK, generateKeyPair, SignJWT} from "jose"
import {afterEach, beforeAll, beforeEach, expect, test, vi} from "vitest"

import {
    getAccessToken,
    requireUser,
    resetJwksCache,
    verifyAccessToken,
} from "~/utils/auth"

const TEAM_DOMAIN = "https://test.cloudflareaccess.com"
const CERTS_URL = `${TEAM_DOMAIN}/cdn-cgi/access/certs`
const AUD = "test-aud-tag"
const EMAIL = "brad@example.com"
const KID = "test-key-1"

let privateKey: CryptoKey
let publicJwk: JWK
let otherPrivateKey: CryptoKey

const env = {
    ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
    ACCESS_AUD: AUD,
    ACCESS_ALLOWED_EMAIL: EMAIL,
} as unknown as Env

type SignOptions = {
    key?: CryptoKey
    kid?: string
    email?: string
    issuer?: string
    audience?: string
    expirationTime?: string | number
}

const sign = (options: SignOptions = {}) => {
    return new SignJWT({email: options.email ?? EMAIL})
        .setProtectedHeader({alg: "RS256", kid: options.kid ?? KID})
        .setIssuedAt()
        .setIssuer(options.issuer ?? TEAM_DOMAIN)
        .setAudience(options.audience ?? AUD)
        .setExpirationTime(options.expirationTime ?? "2h")
        .sign(options.key ?? privateKey)
}

const requestWithToken = (token: string) => {
    return new Request("https://finance.bradgarropy.com/", {
        headers: {"Cf-Access-Jwt-Assertion": token},
    })
}

beforeAll(async () => {
    const pair = await generateKeyPair("RS256", {extractable: true})
    privateKey = pair.privateKey
    publicJwk = {...(await exportJWK(pair.publicKey)), kid: KID, alg: "RS256"}

    const other = await generateKeyPair("RS256", {extractable: true})
    otherPrivateKey = other.privateKey
})

beforeEach(() => {
    resetJwksCache()

    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const url = input instanceof Request ? input.url : String(input)

            if (url === CERTS_URL) {
                return new Response(JSON.stringify({keys: [publicJwk]}), {
                    headers: {"content-type": "application/json"},
                })
            }

            throw new Error(`unexpected fetch: ${url}`)
        }),
    )
})

afterEach(() => {
    vi.unstubAllGlobals()
})

test("bypasses verification in dev", async () => {
    const request = new Request("https://finance.bradgarropy.com/")
    const email = await requireUser(request, env, {dev: true})

    expect(email).toEqual(EMAIL)
})

test("returns email for a valid token", async () => {
    const token = await sign()
    const request = requestWithToken(token)

    const email = await requireUser(request, env, {dev: false})
    expect(email).toEqual(EMAIL)
})

test("reads the token from the CF_Authorization cookie", async () => {
    const token = await sign()

    const request = new Request("https://finance.bradgarropy.com/", {
        headers: {Cookie: `CF_Authorization=${token}; other=1`},
    })

    const email = await requireUser(request, env, {dev: false})
    expect(email).toEqual(EMAIL)
})

test("rejects a missing token", async () => {
    const request = new Request("https://finance.bradgarropy.com/")

    await expect(requireUser(request, env, {dev: false})).rejects.toMatchObject(
        {status: 403},
    )
})

test("rejects a token with the wrong email", async () => {
    const token = await sign({email: "intruder@example.com"})
    const request = requestWithToken(token)

    await expect(requireUser(request, env, {dev: false})).rejects.toMatchObject(
        {status: 403},
    )
})

test("rejects a token with the wrong audience", async () => {
    const token = await sign({audience: "some-other-aud"})
    const request = requestWithToken(token)

    await expect(requireUser(request, env, {dev: false})).rejects.toMatchObject(
        {status: 403},
    )
})

test("rejects a token with the wrong issuer", async () => {
    const token = await sign({issuer: "https://evil.cloudflareaccess.com"})
    const request = requestWithToken(token)

    await expect(requireUser(request, env, {dev: false})).rejects.toMatchObject(
        {status: 403},
    )
})

test("rejects an expired token", async () => {
    const token = await sign({
        expirationTime: Math.floor(Date.now() / 1000) - 60,
    })
    const request = requestWithToken(token)

    await expect(requireUser(request, env, {dev: false})).rejects.toMatchObject(
        {status: 403},
    )
})

test("rejects a forged token signed by an unknown key", async () => {
    const token = await sign({key: otherPrivateKey})
    const request = requestWithToken(token)

    await expect(requireUser(request, env, {dev: false})).rejects.toMatchObject(
        {status: 403},
    )
})

test("fails closed when the AUD is not configured", async () => {
    const token = await sign()
    const request = requestWithToken(token)

    const misconfigured = {...env, ACCESS_AUD: ""} as unknown as Env

    await expect(
        requireUser(request, misconfigured, {dev: false}),
    ).rejects.toMatchObject({status: 403})
})

test("verifyAccessToken returns the payload for a valid token", async () => {
    const token = await sign()

    const payload = await verifyAccessToken(token, {
        teamDomain: TEAM_DOMAIN,
        aud: AUD,
    })

    expect(payload.email).toEqual(EMAIL)
    expect(payload.iss).toEqual(TEAM_DOMAIN)
})

test("getAccessToken prefers the header over the cookie", () => {
    const request = new Request("https://finance.bradgarropy.com/", {
        headers: {
            "Cf-Access-Jwt-Assertion": "header-token",
            "Cookie": "CF_Authorization=cookie-token",
        },
    })

    expect(getAccessToken(request)).toEqual("header-token")
})

test("getAccessToken returns null when no token is present", () => {
    const request = new Request("https://finance.bradgarropy.com/")
    expect(getAccessToken(request)).toBeNull()
})
