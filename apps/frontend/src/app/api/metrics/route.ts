import { NextResponse } from 'next/server'

const toMB = (bytes: number) => Math.round(bytes / (1024 * 1024))

export async function GET() {
  const mem = process.memoryUsage()

  const payload = {
    system: {
      uptime: process.uptime(),
      timestamp: Date.now(),
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development'
    },
    memory: {
      heap: {
        usedMB: toMB(mem.heapUsed),
        totalMB: toMB(mem.heapTotal)
      },
      rss: {
        usedMB: toMB(mem.rss)
      }
    },
    queries: {
      total: 0,
      avgDurationMs: 0,
      slowRequests: 0
    }
  }

  return NextResponse.json(payload)
}

