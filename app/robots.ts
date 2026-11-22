import { MetadataRoute } from 'next'
import { env } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/studio/', '/api/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
