import { NextRequest, NextResponse } from 'next/server'
import { store } from '../_store'

export async function GET(_request: NextRequest) {
  const totalPages = store.pages.length
  const publishedPages = store.pages.filter(p => p.isPublished).length
  const draftPages = totalPages - publishedPages
  const totalBanners = store.banners.length
  const activeBanners = store.banners.filter(b => b.isActive).length
  const totalMedia = store.media.length
  const mediaSize = store.media.reduce((acc, f) => acc + (f.size || 0), 0)
  const pageViews = store.pages.reduce((acc, p) => acc + (p.viewCount || 0), 0)
  const bannerClicks = store.banners.reduce((acc, b) => acc + (b.clickCount || 0), 0)

  const topPages = [...store.pages]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 3)
    .map(p => ({ title: p.title, views: p.viewCount, slug: p.slug }))

  const recentActivity = [
    ...store.pages.slice(0, 1).map(p => ({ type: 'page_created', title: p.title, date: p.createdAt, author: p.authorName })),
    ...store.banners.slice(0, 1).map(b => ({ type: 'banner_updated', title: b.title, date: b.updatedAt, author: 'Marketing Team' })),
    ...store.media.slice(0, 1).map(m => ({ type: 'media_uploaded', title: m.originalName, date: m.createdAt, author: 'Content Manager' })),
  ]

  return NextResponse.json({
    totalPages,
    publishedPages,
    draftPages,
    totalBanners,
    activeBanners,
    totalMedia,
    mediaSize,
    pageViews,
    bannerClicks,
    topPages,
    recentActivity
  })
}
