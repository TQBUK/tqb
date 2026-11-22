import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId, useCdn } from '../env'

// The dataset is private (it holds subscriber personal data), so every read needs a token.
// This client must only be imported from server code: SANITY_API_TOKEN is not exposed to the browser.
export const client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn,
    perspective: 'published',
    token: process.env.SANITY_API_TOKEN,
})
