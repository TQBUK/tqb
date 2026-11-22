// Subscriber documents hold personal data. The dataset is public (private datasets need a paid
// Sanity plan), but documents whose _id contains a "." are only readable with a token, so every
// subscriber MUST be created with an ID from newSubscriberId().
export const SUBSCRIBER_ID_PREFIX = 'subscriber.'

export function newSubscriberId(): string {
    return `${SUBSCRIBER_ID_PREFIX}${crypto.randomUUID()}`
}
