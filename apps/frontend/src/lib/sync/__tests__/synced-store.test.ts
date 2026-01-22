import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as utils from '../../sync/utils'
import { SyncedStore } from '../../sync/synced-store'
import { resync } from '../../sync/resync'

class MockBC {
  constructor(public name: string) {}
  onmessage: ((ev: MessageEvent) => void) | null = null
  postMessage(data: any) { /* no-op */ }
  close() {}
}

beforeEach(() => {
  vi.restoreAllMocks()
  // @ts-ignore
  global.BroadcastChannel = MockBC as any
  // @ts-ignore
  global.navigator = { onLine: true }
  const ls: any = {}
  // @ts-ignore
  global.localStorage = {
    getItem: (k: string) => (k in ls ? ls[k] : null),
    setItem: (k: string, v: string) => { ls[k] = v },
    removeItem: (k: string) => { delete ls[k] }
  }
})

describe('SyncedStore', () => {
  it('emite broadcast y remote insert al hacer setState', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ insert })
    vi.spyOn(utils, 'supabase', 'get').mockReturnValue({ from } as any)

    const store = new SyncedStore('test:key', { a: 1 }, { channel: 'c', entityId: 'e' })
    store.setState({ a: 2 }, 'state.patch')
    expect(store.getData().a).toBe(2)
    expect(from).toHaveBeenCalledWith('sync_events')
    expect(insert).toHaveBeenCalledTimes(1)
  })
})

describe('resync', () => {
  it('aplica eventos por version ascendente', async () => {
    const rows = [
      { channel: 'c', entity_id: 'e', version: 2, origin: 'x', type: 't', payload: { a: 3 } },
      { channel: 'c', entity_id: 'e', version: 3, origin: 'y', type: 't', payload: { a: 4 } }
    ]
    const order = vi.fn().mockResolvedValue({ data: rows, error: null })
    const gt = vi.fn().mockReturnValue({ order })
    const eq2 = vi.fn().mockReturnValue({ gt })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const select = vi.fn().mockReturnValue({ eq: eq1 })
    const from = vi.fn().mockReturnValue({ select })
    vi.spyOn(utils, 'supabase', 'get').mockReturnValue({ from } as any)

    const evts = await resync('c', 'e', 1)
    expect(evts.length).toBe(2)
    expect(evts[0].version).toBe(2)
    expect(evts[1].version).toBe(3)
  })
}
)