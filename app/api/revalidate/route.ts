import { revalidatePath } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"
import { parseBody } from "next-sanity/webhook"
import { env } from "@/lib/env"

// Called by a Sanity GROQ webhook when content is published, so pages refresh immediately instead
// of waiting for their time-based `revalidate` window (which is only a safety net).
export async function POST(req: NextRequest) {
    if (!env.SANITY_REVALIDATE_SECRET) {
        console.error("❌ SANITY_REVALIDATE_SECRET is not set. Rejecting revalidation request.")
        return NextResponse.json({ error: "Revalidation not configured" }, { status: 500 })
    }

    try {
        // The third argument waits for Content Lake consistency so the refreshed pages see the new content.
        const { isValidSignature, body } = await parseBody<{ _type?: string }>(req, env.SANITY_REVALIDATE_SECRET, true)

        if (!isValidSignature) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
        }

        // Subscriber documents are written by our own API routes and never rendered on pages.
        if (body?._type === "subscriber") {
            return NextResponse.json({ revalidated: false, reason: "ignored type" })
        }

        // Small site, and every page shares siteSettings (header/footer), so refresh everything.
        revalidatePath("/", "layout")
        console.log(`♻️ Revalidated all pages after a "${body?._type ?? "unknown"}" change`)

        return NextResponse.json({ revalidated: true, type: body?._type ?? null })
    } catch (error) {
        console.error("Revalidation failed:", error)
        return NextResponse.json({ error: "Revalidation failed" }, { status: 500 })
    }
}
