import { z } from 'zod'

// Single source of truth for configuration. Server code reads `env.*` from here.
// Exceptions: client components ("use client") and sanity/env.ts (also loaded by the in-browser
// Studio) read process.env.NEXT_PUBLIC_* directly, because importing this module would ship the
// validation code to the browser. Next.js inlines those values at build time.
const envSchema = z.object({
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_UK_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_INTL_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PORTAL_URL: z.string().url(),

    NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_SANITY_DATASET: z.string().min(1),
    SANITY_API_TOKEN: z.string().optional(),
    SANITY_REVALIDATE_SECRET: z.string().optional(),

    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_UK_PRICE_ID: z.string().optional(),
    STRIPE_INTL_PRICE_ID: z.string().optional(),
    STRIPE_GIFT_UK_PRICE_ID: z.string().optional(),
    STRIPE_GIFT_INTL_PRICE_ID: z.string().optional(),
    GIFT_DURATION_MONTHS: z.coerce.number().int().positive().default(3),
    RESEND_API_KEY: z.string().optional(),
    RESEND_AUDIENCE_ID: z.string().optional(),
    RESEND_LEADS_AUDIENCE_ID: z.string().optional(),
    EMAIL_FROM: z.string().min(1).default("The Quiet Bloom <hello@thequietbloom.co.uk>"),
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: z.string().optional(),
})

export const env = envSchema.parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_STRIPE_UK_URL: process.env.NEXT_PUBLIC_STRIPE_UK_URL,
    NEXT_PUBLIC_STRIPE_INTL_URL: process.env.NEXT_PUBLIC_STRIPE_INTL_URL,
    NEXT_PUBLIC_STRIPE_PORTAL_URL: process.env.NEXT_PUBLIC_STRIPE_PORTAL_URL,

    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
    SANITY_API_TOKEN: process.env.SANITY_API_TOKEN,
    SANITY_REVALIDATE_SECRET: process.env.SANITY_REVALIDATE_SECRET,

    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_UK_PRICE_ID: process.env.STRIPE_UK_PRICE_ID,
    STRIPE_INTL_PRICE_ID: process.env.STRIPE_INTL_PRICE_ID,
    STRIPE_GIFT_UK_PRICE_ID: process.env.STRIPE_GIFT_UK_PRICE_ID,
    STRIPE_GIFT_INTL_PRICE_ID: process.env.STRIPE_GIFT_INTL_PRICE_ID,
    GIFT_DURATION_MONTHS: process.env.GIFT_DURATION_MONTHS || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_AUDIENCE_ID: process.env.RESEND_AUDIENCE_ID,
    RESEND_LEADS_AUDIENCE_ID: process.env.RESEND_LEADS_AUDIENCE_ID,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
})
