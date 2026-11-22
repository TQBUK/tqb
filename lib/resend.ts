import { Resend } from "resend"
import { env } from "@/lib/env"

let client: Resend | undefined

// Created on first use rather than at import: the Resend SDK throws when constructed without a key,
// which broke `next build` wherever RESEND_API_KEY isn't set (e.g. Vercel Preview).
export function getResend(): Resend {
    if (!env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not set")
    }
    client ??= new Resend(env.RESEND_API_KEY)
    return client
}
