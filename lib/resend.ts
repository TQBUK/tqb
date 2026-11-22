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

// Adds the contact to the audience, or re-subscribes it if it already exists (e.g. a returning
// subscriber). The SDK reports API failures in `error` rather than throwing, so check both.
export async function upsertAudienceContact(
    audienceId: string,
    contact: { email: string; firstName?: string; lastName?: string },
): Promise<void> {
    const resend = getResend()
    const created = await resend.contacts.create({ ...contact, audienceId, unsubscribed: false })
    if (!created.error) return

    const updated = await resend.contacts.update({ ...contact, audienceId, unsubscribed: false })
    if (updated.error) {
        throw new Error(`Resend contact upsert failed: create: ${created.error.message}; update: ${updated.error.message}`)
    }
}
