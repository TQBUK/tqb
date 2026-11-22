import Stripe from "stripe"
import { env } from "@/lib/env"

let client: Stripe | undefined

// Created on first use rather than at import: the Stripe SDK throws when constructed without a key,
// which broke `next build` wherever STRIPE_SECRET_KEY isn't set (e.g. Vercel Preview).
export function getStripe(): Stripe {
    if (!env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is not set")
    }
    client ??= new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: "2026-01-28.clover",
    })
    return client
}
