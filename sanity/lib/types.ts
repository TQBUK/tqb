import type { SanityImageSource } from '@sanity/image-url'

// Shapes of the CMS data our components read. Fields are optional where the CMS allows them to be empty.

export interface NavLink {
    label: string
    url: string
}

export interface SocialLink {
    platform: string
    url: string
}

// Result of postsQuery (sanity/lib/queries.ts)
export interface PostSummary {
    _id: string
    title: string
    slug: string
    publishedAt?: string
    excerpt?: string
    mainImage?: SanityImageSource
}

export interface PricingTier {
    name: string
    price?: string
}

export interface GiftTier {
    name: string
    duration?: string
    price?: string
    perMonth?: string
    features?: string[]
}

export interface GiftStep {
    stepNumber?: string
    title?: string
    description?: string
}

// Result of giftPageQuery
export interface GiftPageData {
    hero?: { badgeText?: string; heading?: string; subheading?: string; italicNote?: string }
    howItWorks?: { heading?: string; steps?: GiftStep[] }
    pricing?: { heading?: string; subheading?: string; tiers?: GiftTier[] }
    reassurance?: { quoteText?: string; disclaimer?: string }
}

export type { SanityImageSource }
