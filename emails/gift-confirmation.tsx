import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
    Section,
    Link,
    Hr,
} from "@react-email/components"
import * as React from "react"

interface GiftConfirmationEmailProps {
    recipientName?: string
    giftMessage?: string
    durationMonths?: number
}

// Sent to the person who bought a gift (they are not the subscriber themselves).
export const GiftConfirmationEmail = ({
    recipientName = "your recipient",
    giftMessage = "",
    durationMonths = 3,
}: GiftConfirmationEmailProps) => {
    const months = `${durationMonths} ${durationMonths === 1 ? "month" : "months"}`
    return (
        <Html>
            <Head />
            <Preview>Your gift of The Quiet Bloom for {recipientName}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={headerSection}>
                        <Heading style={h1}>The Quiet Bloom</Heading>
                    </Section>

                    <Section style={bodySection}>
                        <Text style={headingText}>Thank you for your gift.</Text>

                        <Hr style={divider} />

                        <Text style={text}>
                            {recipientName} will receive {months} of The Quiet Bloom: a thoughtfully prepared
                            envelope each month, sent to the address you gave at checkout.
                        </Text>

                        {giftMessage.trim() !== "" && (
                            <>
                                <Text style={text}>Your message, which we&apos;ll include with their first letter:</Text>
                                <Text style={quote}>&ldquo;{giftMessage}&rdquo;</Text>
                            </>
                        )}

                        <Text style={text}>
                            This was a one-off payment, so there is nothing to cancel and you won&apos;t be charged again.
                        </Text>

                        <Text style={signature}>
                            Warmly,
                            <br />
                            The Quiet Bloom
                        </Text>
                    </Section>

                    <Section style={footer}>
                        <Text style={footerText}>
                            You received this because you bought a gift at{" "}
                            <Link href="https://thequietbloom.co.uk" style={footerLink}>
                                thequietbloom.co.uk
                            </Link>.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

export default GiftConfirmationEmail

// Styles (shared look with emails/welcome.tsx)
const main = {
    backgroundColor: "#f5f5f4", // stone-50
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
    margin: "0 auto",
    padding: "40px 20px",
    maxWidth: "600px",
}

const headerSection = {
    padding: "20px 0",
}

const h1 = {
    color: "#1c1917", // stone-900
    fontSize: "28px",
    fontWeight: "400",
    textAlign: "center" as const,
    margin: "0",
    fontFamily: "Georgia, serif",
}

const bodySection = {
    backgroundColor: "#ffffff",
    padding: "48px 40px",
    borderRadius: "12px",
    borderTop: "4px solid #1c1917",
    borderLeft: "1px solid #e7e5e4",
    borderRight: "1px solid #e7e5e4",
    borderBottom: "1px solid #e7e5e4",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
}

const headingText = {
    color: "#1c1917",
    fontSize: "20px",
    lineHeight: "32px",
    fontWeight: "400",
    textAlign: "center" as const,
    fontFamily: "Georgia, serif",
    margin: "0 0 24px 0",
}

const divider = {
    borderColor: "#e7e5e4", // stone-200
    margin: "24px 0",
}

const text = {
    color: "#57534e", // stone-600
    fontSize: "16px",
    lineHeight: "28px",
    fontWeight: "300",
    margin: "0 0 16px 0",
}

const quote = {
    ...text,
    fontStyle: "italic" as const,
    fontFamily: "Georgia, serif",
    borderLeft: "3px solid #e7e5e4",
    paddingLeft: "16px",
}

const signature = {
    color: "#1c1917", // stone-900
    fontSize: "16px",
    lineHeight: "26px",
    fontWeight: "400",
    marginTop: "40px",
}

const footer = {
    padding: "32px 20px",
}

const footerText = {
    color: "#a8a29e", // stone-400
    fontSize: "13px",
    textAlign: "center" as const,
}

const footerLink = {
    color: "#57534e", // stone-600
    textDecoration: "underline",
}
