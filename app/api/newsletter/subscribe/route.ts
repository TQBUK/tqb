import { client } from "@/sanity/lib/client"
import { newSubscriberId } from "@/sanity/lib/subscriber"
import { NextResponse } from "next/server"
import { getResend, upsertAudienceContact } from "@/lib/resend"
import { env } from "@/lib/env"

export async function POST(req: Request) {
    try {
        const { email } = await req.json()

        if (!email || !email.includes("@")) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
        }

        // Check if already subscribed in Sanity (gift records are stored under the buyer's email; ignore them)
        const existing: { _id: string; status?: string } | null = await client.fetch(
            `*[_type == "subscriber" && email == $email && isGift != true][0]{_id, status}`,
            { email }
        )

        if (existing?.status === 'active') {
            return NextResponse.json({ message: "Already subscribed" }, { status: 200 })
        }

        // Add to (or re-subscribe in) the Resend Audience first
        const targetAudienceId = env.RESEND_LEADS_AUDIENCE_ID || env.RESEND_AUDIENCE_ID
        if (targetAudienceId) {
            try {
                await upsertAudienceContact(targetAudienceId, { email })
                console.log("Added to Resend Audience successfully.")
            } catch (resendError) {
                console.error("Resend Audience Add Error:", resendError)
                // We're letting this pass through even if it fails, so Sanity still captures them
            }
        }

        if (existing) {
            // Returning reader (previously unsubscribed, or a cancelled paid subscriber): re-activate as free.
            await client.patch(existing._id).set({ status: 'active', tier: 'free' }).commit()
        } else {
            await client.create({
                _id: newSubscriberId(),
                _type: 'subscriber',
                email,
                status: 'active',
                tier: 'free',
                signedUpAt: new Date().toISOString()
            })
        }

        try {
            // Send the free tier welcome email using the Resend Hosted Template
            const { data, error } = await getResend().emails.send({
                from: env.EMAIL_FROM,
                to: email,
                subject: "Welcome to our quiet corner of the internet.", // Fallback subject if not set in template
                template: {
                    id: "free-subscriber-welcome-email", // The slug from the Resend Dashboard screenshot
                },
            })

            if (error) {
                console.error("Resend Delivery Error:", error)
            } else {
                console.log("Welcome email template dispatched successfully:", data)
            }
        } catch (emailError) {
            console.error("Welcome Email Sending Error:", emailError)
        }
        
        return NextResponse.json({ message: "Successfully subscribed" }, { status: 201 })

    } catch (error) {
        console.error("Newsletter Subscription Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
