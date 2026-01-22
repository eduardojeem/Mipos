import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, type EditingFormData } from '../index'

function getState() {
  return useStore.getState()
}

describe('Product editing store sync', () => {
  beforeEach(() => {
    useStore.setState({ currentProductId: null, formData: null, isEditing: false, isLoading: false, error: undefined })
  })

  it('sets current product and form data', () => {
    getState().setCurrentProductId('p1')
    const initial: EditingFormData = {
      name: 'Nombre',
      code: 'SKU-1',
      description: 'Desc',
      categoryId: 'cat1',
      price: 10,
      costPrice: 5,
      wholesalePrice: 8,
      offerPrice: undefined,
      offerActive: false,
      stock: 3,
      minStock: 1,
      images: '',
      brand: 'Marca',
      shade: undefined,
      skin_type: undefined,
      ingredients: undefined,
      volume: undefined,
      spf: undefined,
      finish: undefined,
      coverage: undefined,
      waterproof: undefined,
      vegan: undefined,
      cruelty_free: undefined,
      expiration_date: undefined,
    }
    getState().setFormData(initial)
    const s = getState()
    expect(s.currentProductId).toBe('p1')
    expect(s.formData?.name).toBe('Nombre')
    expect(s.formData?.price).toBe(10)
  })

  it('patches form data incrementally', () => {
    getState().setFormData({
      name: 'A', code: 'C1', description: '', categoryId: 'cat', price: 1, costPrice: 0, wholesalePrice: 1, stock: 0, minStock: 0
    } as EditingFormData)
    getState().patchFormData({ name: 'B' })
    getState().patchFormData({ price: 20 })
    const s = getState()
    expect(s.formData?.name).toBe('B')
    expect(s.formData?.price).toBe(20)
  })
})