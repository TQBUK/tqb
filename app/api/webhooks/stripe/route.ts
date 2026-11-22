import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { env } from "@/lib/env"
import { client } from "@/sanity/lib/client"
import { giftSubscriberId, newSubscriberId } from "@/sanity/lib/subscriber"
import { getStripe } from "@/lib/stripe"
import { getResend, upsertAudienceContact } from "@/lib/resend"
import WelcomeEmail from "@/emails/welcome"
import GiftConfirmationEmail from "@/emails/gift-confirmation"

import UnsubscribedEmail from "@/emails/unsubscribed"

export async function POST(req: Request) {
    const body = await req.text()

    const signature = (await headers()).get("Stripe-Signature")

    let event: Stripe.Event

    try {
        if (!env.STRIPE_WEBHOOK_SECRET) {
            // Unsigned events are only accepted in local dev; anywhere else anyone could forge a payment.
            if (process.env.NODE_ENV !== "development") {
                console.error("❌ STRIPE_WEBHOOK_SECRET is not set. Rejecting webhook.")
                return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
            }
            console.warn("⚠️ STRIPE_WEBHOOK_SECRET is not set. Webhook verification skipped (development only).")
            event = JSON.parse(body)
        } else {
            if (!signature) {
                return NextResponse.json({ error: "Missing signature" }, { status: 400 })
            }
            event = Stripe.webhooks.constructEvent(
                body,
                signature,
                env.STRIPE_WEBHOOK_SECRET
            )
        }
    } catch (error) {
        console.error("Webhook signature verification failed:", error instanceof Error ? error.message : error)
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session

                // 1. Get Customer Email
                const customerEmail = session.customer_details?.email
                if (!customerEmail) {
                    throw new Error("No customer email found in session")
                }

                // 1b. Check if this is a gift purchase
                const isGift = session.metadata?.isGift === "true"
                let giftRecipientName = ""
                let giftMessage = ""

                if (isGift && session.custom_fields) {
                    for (const field of session.custom_fields) {
                        if (field.key === "recipientname" && field.text?.value) {
                            giftRecipientName = field.text.value
                        }
                        if (field.key === "giftmessage" && field.text?.value) {
                            giftMessage = field.text.value
                        }
                    }
                    console.log(`🎁 Gift purchase detected! Recipient: ${giftRecipientName}`)
                }

                // 2. Fetch Email Content from Sanity
                let emailContent = {
                    subject: "Welcome to The Quiet Bloom",
                    heading: "Welcome to our quiet corner of the internet.",
                    bodyText: "Thank you for subscribing. By becoming a patron, you're not just supporting our work—you're joining a community that values intentionality, reflection, and quiet luxury.\n\nEach month, you will receive a digital letter curated carefully to bring a moment of pause to your day.\n\nWe are so glad you are here.",
                    signoff: "Warmly,\nThe Quiet Bloom",
                }

                if (env.SANITY_API_TOKEN) {
                    try {
                        const fetchedContent = await client.fetch(`*[_type == "welcomeEmail"][0]`)
                        if (fetchedContent) {
                            emailContent = { ...emailContent, ...fetchedContent }
                        }
                    } catch (err) {
                        console.error("Failed to fetch Welcome Email content from Sanity:", err)
                    }
                }

                // 3a. Gift: the buyer isn't the subscriber, so confirm the gift instead of welcoming them,
                // and don't add them to the paid audience.
                if (isGift) {
                    if (env.RESEND_API_KEY) {
                        const { error: emailError } = await getResend().emails.send({
                            from: env.EMAIL_FROM,
                            to: [customerEmail],
                            subject: `Your gift of The Quiet Bloom${giftRecipientName ? ` for ${giftRecipientName}` : ""}`,
                            react: GiftConfirmationEmail({
                                recipientName: giftRecipientName || undefined,
                                giftMessage,
                                durationMonths: parseInt(session.metadata?.giftDurationMonths || "3", 10),
                            }),
                        })
                        if (emailError) {
                            console.error(`❌ Failed to send Gift Confirmation Email to ${customerEmail}:`, emailError)
                        } else {
                            console.log(`✉️ Gift Confirmation Email sent to ${customerEmail}`)
                        }
                    } else {
                        console.warn("⚠️ RESEND_API_KEY is not set. Skipping Gift Confirmation Email.")
                    }
                }
                // 3b. Subscription: Send Welcome Email via Resend & Sync Contact
                else if (env.RESEND_API_KEY) {
                    const { error: emailError } = await getResend().emails.send({
                        from: env.EMAIL_FROM,
                        to: [customerEmail],
                        subject: emailContent.subject,
                        react: WelcomeEmail({
                            email: customerEmail,
                            heading: emailContent.heading,
                            bodyText: emailContent.bodyText,
                            signoff: emailContent.signoff,
                        }),
                    })

                    if (emailError) {
                        console.error(`❌ Failed to send Welcome Email to ${customerEmail}:`, emailError)
                    } else {
                        console.log(`✉️ Automated Welcome Email sent to ${customerEmail}`)
                    }

                    // Add to Resend Audience
                    if (env.RESEND_AUDIENCE_ID) {
                        try {
                            await upsertAudienceContact(env.RESEND_AUDIENCE_ID, {
                                email: customerEmail,
                                firstName: session.customer_details?.name?.split(' ')[0] || "",
                                lastName: session.customer_details?.name?.split(' ').slice(1).join(' ') || "",
                            })
                            console.log(`👥 Added ${customerEmail} to Resend Audience.`)
                        } catch (contactErr) {
                            console.error(`❌ Failed to add ${customerEmail} to Resend Audience:`, contactErr)
                        }
                    } else {
                        console.warn("⚠️ RESEND_AUDIENCE_ID is not set. Skipping audience sync.")
                    }
                } else {
                    console.warn("⚠️ RESEND_API_KEY is not set. Skipping Welcome Email.")
                }

                // 4. Save Subscriber to Sanity (with gift data if applicable)
                if (env.SANITY_API_TOKEN) {
                    if (isGift) {
                        // Each gift is its own record. Gifts are stored under the buyer's email, so they must
                        // never overwrite the buyer's own subscription. The ID is derived from the Checkout
                        // Session, so a retried webhook doesn't create a duplicate.
                        const durationMonths = parseInt(session.metadata?.giftDurationMonths || "3", 10)
                        const expiresAt = new Date()
                        expiresAt.setMonth(expiresAt.getMonth() + durationMonths)

                        await client.createIfNotExists({
                            _id: giftSubscriberId(session.id),
                            _type: 'subscriber',
                            email: customerEmail,
                            status: 'active',
                            tier: 'paid',
                            signedUpAt: new Date().toISOString(),
                            isGift: true,
                            giftRecipientName,
                            giftMessage,
                            gifterEmail: customerEmail,
                            giftExpiresAt: expiresAt.toISOString(),
                        })
                        console.log(`📝 Gift order 🎁 from ${customerEmail} saved to Sanity (expires ${expiresAt.toISOString()})`)
                    } else {
                        // Upgrades a free reader or re-activates a cancelled subscriber; creates one otherwise.
                        const existing = await client.fetch(
                            `*[_type == "subscriber" && email == $email && isGift != true][0]{_id}`,
                            { email: customerEmail }
                        )

                        if (existing) {
                            await client.patch(existing._id).set({ tier: 'paid', status: 'active' }).commit()
                            console.log(`📝 Subscriber ${customerEmail} upgraded/re-activated as paid in Sanity.`)
                        } else {
                            await client.create({
                                _id: newSubscriberId(),
                                _type: 'subscriber',
                                email: customerEmail,
                                status: 'active',
                                tier: 'paid',
                                signedUpAt: new Date().toISOString(),
                                isGift: false,
                            })
                            console.log(`📝 Subscriber ${customerEmail} saved to Sanity.`)
                        }
                    }
                } else {
                    console.warn("⚠️ SANITY_API_TOKEN is not set. Skipping Sanity save.")
                }

                break
            }



            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription

                // Fetch customer to get email since it's not on the subscription object directly
                const customerId = subscription.customer as string
                const customer = await getStripe().customers.retrieve(customerId) as Stripe.Customer
                const customerEmail = customer.email

                if (!customerEmail) break

                // 1. Fetch Unsubscribed Content from Sanity
                let emailContent = {
                    subject: "Your Subscription has been Cancelled",
                    heading: "Farewell for now.",
                    bodyText: "We are writing to confirm that your subscription to The Quiet Bloom has been successfully cancelled.\n\nYou will not be billed again. We are honored to have shared our quiet corner of the internet with you, even if just for a little while.\n\nThe door is always open should you choose to return.",
                    signoff: "Warmly,\nThe Quiet Bloom",
                }

                if (env.SANITY_API_TOKEN) {
                    try {
                        const fetchedContent = await client.fetch(`*[_type == "unsubscribedEmail"][0]`)
                        if (fetchedContent) {
                            emailContent = { ...emailContent, ...fetchedContent }
                        }
                    } catch (err) {
                        console.error("Failed to fetch Unsubscribed Email content from Sanity:", err)
                    }
                }

                // 2. Send Cancellation Email via Resend
                if (env.RESEND_API_KEY) {
                    const { error: emailError } = await getResend().emails.send({
                        from: env.EMAIL_FROM,
                        to: [customerEmail],
                        subject: emailContent.subject,
                        react: UnsubscribedEmail({
                            email: customerEmail,
                            heading: emailContent.heading,
                            bodyText: emailContent.bodyText,
                            signoff: emailContent.signoff,
                        }),
                    })
                    if (emailError) {
                        console.error(`❌ Failed to send Cancellation Email to ${customerEmail}:`, emailError)
                    } else {
                        console.log(`✉️ Automated Cancellation Email sent to ${customerEmail}`)
                    }

                    // Remove them from the Resend Audience (by email, so it works regardless of audience size)
                    if (env.RESEND_AUDIENCE_ID) {
                        try {
                            const { error } = await getResend().contacts.remove({
                                audienceId: env.RESEND_AUDIENCE_ID,
                                email: customerEmail,
                            })
                            if (error) {
                                console.error(`❌ Failed to remove ${customerEmail} from Resend Audience:`, error)
                            } else {
                                console.log(`👥 Removed ${customerEmail} from Resend Audience.`)
                            }
                        } catch (err) {
                            console.error(`❌ Failed to remove ${customerEmail} from Resend Audience:`, err)
                        }
                    }
                }

                // 3. Update Sanity Status (the subscription record, never a gift bought by this customer)
                if (env.SANITY_API_TOKEN) {
                    try {
                        const existing = await client.fetch(
                            `*[_type == "subscriber" && email == $email && isGift != true][0]{_id}`,
                            { email: customerEmail }
                        )
                        if (existing) {
                            await client.patch(existing._id).set({ status: 'cancelled' }).commit()
                            console.log(`📝 Marked ${customerEmail} as cancelled in Sanity.`)
                        } else {
                            console.warn(`⚠️ No subscriber record found in Sanity for cancelled customer ${customerEmail}`)
                        }
                    } catch (err) {
                        console.error(`❌ Failed to mark ${customerEmail} as cancelled in Sanity:`, err)
                    }
                }

                break
            }
            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error("Webhook handler error:", error)
        return NextResponse.json(
            { error: "Webhook handler failed" },
            { status: 500 }
        )
    }
}
