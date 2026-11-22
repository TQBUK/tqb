/**
 * One-off migration: move subscriber documents to dotted IDs (`subscriber.<uuid>`) so they are no
 * longer readable without a token in the public dataset. See sanity/lib/subscriber.ts.
 *
 * Dry run (default):  node scripts/migrate-subscriber-ids.ts
 * Apply:              node scripts/migrate-subscriber-ids.ts --apply
 *
 * Needs SANITY_API_TOKEN (write access) in .env.local.
 */
import { createClient } from 'next-sanity'

process.loadEnvFile('.env.local')

const PREFIX = 'subscriber.'
const apply = process.argv.includes('--apply')

const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    token: process.env.SANITY_API_TOKEN,
    apiVersion: '2024-02-19',
    useCdn: false,
    perspective: 'raw', // include drafts
})

type Doc = { _id: string; _type: string; _rev?: string; _createdAt?: string; _updatedAt?: string; [key: string]: unknown }

const baseId = (id: string) => id.replace(/^drafts\./, '')

async function migrate() {
    if (!process.env.SANITY_API_TOKEN) throw new Error('SANITY_API_TOKEN is not set in .env.local')

    const docs: Doc[] = await client.fetch(`*[_type == "subscriber"]`)
    const toMove = docs.filter((d) => !baseId(d._id).startsWith(PREFIX))

    // Published doc and its draft (if any) share a base ID and must move to the same new ID.
    const groups = new Map<string, Doc[]>()
    for (const doc of toMove) {
        const key = baseId(doc._id)
        groups.set(key, [...(groups.get(key) ?? []), doc])
    }

    console.log(`Subscriber documents: ${docs.length} total, ${toMove.length} to move (${groups.size} subscribers).`)
    if (!apply) console.log('Dry run — pass --apply to write changes.\n')

    let moved = 0
    for (const [oldBase, group] of groups) {
        const newBase = `${PREFIX}${crypto.randomUUID()}`
        const tx = client.transaction()
        for (const doc of group) {
            const { _rev, _createdAt, _updatedAt, ...fields } = doc
            const isDraft = doc._id.startsWith('drafts.')
            tx.create({ ...fields, _id: isDraft ? `drafts.${newBase}` : newBase })
            tx.delete(doc._id)
        }
        console.log(`${oldBase} -> ${newBase}${group.length > 1 ? ' (incl. draft)' : ''}`)
        if (apply) {
            await tx.commit()
            moved++
        }
    }

    if (apply) {
        const remaining: number = await client.fetch(
            `count(*[_type == "subscriber" && !(_id in path("${PREFIX}**")) && !(_id in path("drafts.${PREFIX}**"))])`
        )
        console.log(`\nMoved ${moved} subscribers. Subscribers still on public IDs: ${remaining}`)
    }
}

migrate().catch((err) => {
    console.error(err)
    process.exit(1)
})
