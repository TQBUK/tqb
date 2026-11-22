import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { env } from "@/lib/env"
import { getStripe } from "@/lib/stripe"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const tier: string = typeof body?.tier === "string" ? body.tier : ""
        const isGift = body?.isGift === true

        // The price is always resolved server-side from the tier name (tier names are CMS-editable,
        // so we match on "UK" / "International"). Never accept a price ID from the client.
        const region = tier.includes("UK") ? "UK" : tier.includes("International") ? "International" : null
        if (!region) {
            return NextResponse.json({ error: "Unknown subscription tier" }, { status: 400 })
        }

        const actualPriceId = isGift
            ? (region === "UK" ? env.STRIPE_GIFT_UK_PRICE_ID : env.STRIPE_GIFT_INTL_PRICE_ID)
            : (region === "UK" ? env.STRIPE_UK_PRICE_ID : env.STRIPE_INTL_PRICE_ID)

        if (!actualPriceId || !env.STRIPE_SECRET_KEY) {
            console.error(`❌ Checkout misconfigured: missing Stripe secret key or price ID for ${region}${isGift ? " gift" : ""}`)
            return NextResponse.json({ error: "Checkout is temporarily unavailable" }, { status: 500 })
        }

        // Base custom fields (always present)
        const customFields: Stripe.Checkout.SessionCreateParams.CustomField[] = [
            {
                key: "birthdaymonth",
                label: { type: "custom", custom: isGift ? "Recipient's Birthday Month" : "Birthday Month" },
                type: "dropdown",
                optional: true,
                dropdown: {
                    options: [
                        { label: "January", value: "january" },
                        { label: "February", value: "february" },
                        { label: "March", value: "march" },
                        { label: "April", value: "april" },
                        { label: "May", value: "may" },
                        { label: "June", value: "june" },
                        { label: "July", value: "july" },
                        { label: "August", value: "august" },
                        { label: "September", value: "september" },
                        { label: "October", value: "october" },
                        { label: "November", value: "november" },
                        { label: "December", value: "december" },
                    ],
                },
            },
        ]

        // Gift-specific custom fields
        if (isGift) {
            customFields.push(
                {
                    key: "recipientname",
                    label: { type: "custom", custom: "Recipient's Full Name" },
                    type: "text",
                    optional: false,
                },
                {
                    key: "giftmessage",
                    label: { type: "custom", custom: "Gift Message (e.g. Happy Birthday! — Sarah)" },
                    type: "text",
                    optional: true,
                },
            )
        }

        const giftDuration = env.GIFT_DURATION_MONTHS

        const session = await getStripe().checkout.sessions.create({
            payment_method_types: ["card"],
            mode: isGift ? "payment" : "subscription",
            custom_fields: customFields,
            metadata: {
                isGift: isGift ? "true" : "false",
                tier: tier || "",
                ...(isGift ? { giftDurationMonths: String(giftDuration) } : {}),
            },
            shipping_address_collection: {
                allowed_countries: region === "UK"
                    ? ["GB"]
                    : ["US", "CA", "AU", "NZ", "IE", "FR", "DE", "IT", "ES", "NL", "SE"],
            },
            line_items: [
                {
                    price: actualPriceId,
                    quantity: 1,
                },
            ],
            success_url: `${env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/subscribe`,
        })

        return NextResponse.json({ url: session.url })
    } catch (error: any) {
        console.error("Stripe Checkout Error:", error)
        return NextResponse.json(
            { error: error?.message || "Internal Server Error" },
            { status: 500 }
        )
    }
}
