import type { ImageLoaderProps } from "next/image"

// Sanity and Unsplash resize and convert images on their own CDNs for free, so we hand them the
// work instead of using (and paying for) the hosting platform's image optimisation.
export default function imageLoader({ src, width, quality }: ImageLoaderProps) {
    // Relative paths can't be parsed without a base; they're served as-is below.
    const url = new URL(src, "http://relative.invalid")

    if (url.hostname === "cdn.sanity.io") {
        url.searchParams.set("w", String(width))
        url.searchParams.set("q", String(quality || 75))
        url.searchParams.set("auto", "format")
        url.searchParams.set("fit", "max")
        return url.toString()
    }

    if (url.hostname === "images.unsplash.com") {
        url.searchParams.set("w", String(width))
        url.searchParams.set("q", String(quality || 75))
        url.searchParams.set("auto", "format")
        return url.toString()
    }

    // Local or unknown images are served unmodified.
    return src
}
