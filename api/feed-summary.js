// GET /api/feed-summary?startDate=&endDate=
// ย่อจาก mona-ops/api/dashboard.js — เอาแค่ packBySku + dataRange สำหรับหน้า FeedProducts
import { getMetaCached, batchGetValues } from './_lib/sheets.js'
import { getSkuRedirectMap, getSetRecipeKeySet, resolveSalesSku } from './_lib/skuMapping.js'

const cache = new Map()
const CACHE_MS = 180000

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })

  const { startDate = '', endDate = '' } = req.query
  const inDate = (d) => (!startDate || d >= startDate) && (!endDate || d <= endDate)

  const cacheKey = `${startDate}|${endDate}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return res.status(200).json(cached.data)
  }

  try {
    const [redirectMap, recipeKeySet] = await Promise.all([getSkuRedirectMap(), getSetRecipeKeySet()])

    const meta = await getMetaCached()
    const tabs = meta.sheets.map((s) => s.properties.title).filter((t) => t.startsWith('raw_orders'))

    const ranges = tabs.flatMap((t) => [`${t}!D:D`, `${t}!I:N`])
    const vr = await batchGetValues(ranges)

    const availableDateSet = new Set()
    const packBySku = new Map()

    for (let i = 0; i < tabs.length; i++) {
      const left = vr[2 * i].values || []
      const right = vr[2 * i + 1].values || []
      const n = Math.max(left.length, right.length)
      for (let j = 1; j < n; j++) {
        const l = left[j] || [], r = right[j] || []
        const date = l[0]
        if (!date) continue
        availableDateSet.add(date)
        if (!inDate(date)) continue

        const variationName = r[0], rawMasterSku = r[1], name = r[2], qty = parseInt(r[3], 10) || 0
        const masterSku = resolveSalesSku(rawMasterSku, variationName, redirectMap, recipeKeySet)
        if (!masterSku) continue

        let p = packBySku.get(masterSku)
        if (!p) packBySku.set(masterSku, (p = { master_sku: masterSku, display_name: name || masterSku, qty: 0 }))
        p.qty += qty
      }
    }

    const sortedAvailableDates = [...availableDateSet].sort()
    const data = {
      success: true,
      packBySku: [...packBySku.values()].sort((a, b) => b.qty - a.qty),
      dataRange: {
        earliestDate: sortedAvailableDates[0] || null,
        latestDate: sortedAvailableDates[sortedAvailableDates.length - 1] || null,
      },
    }
    cache.set(cacheKey, { data, at: Date.now() })
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
}
