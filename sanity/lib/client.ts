import { env } from "@/lib/env"
import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId, useCdn } from '../env'

// Authenticated so server code can read subscriber documents, which are hidden from anonymous
// reads (see sanity/lib/subscriber.ts). Only import this client from server code.
export const client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn,
    perspective: 'published',
    token: env.SANITY_API_TOKEN,
})
