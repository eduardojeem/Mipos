'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TagFormData {
  name: string;
  color: string;
  description: string;
  category: 'performance' | 'location' | 'product' | 'relationship' | 'custom';
}

interface TagFormProps {
  formData: TagFormData;
  onChange: (data: TagFormData) => void;
  isEdit?: boolean;
}

const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#374151'
] as const;

const TAG_CATEGORIES = [
  { value: 'performance', label: 'Rendimiento', icon: '📊' },
  { value: 'location', label: 'Ubicación', icon: '📍' },
  { value: 'product', label: 'Producto', icon: '📦' },
  { value: 'relationship', label: 'Relación', icon: '🤝' },
  { value: 'custom', label: 'Personalizado', icon: '🏷️' }
] as const;

export function TagForm({ formData, onChange, isEdit = false }: TagFormProps) {
  const handleChange = (field: keyof TagFormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={isEdit ? 'edit-name' : 'name'}>Nombre</Label>
        <Input
          id={isEdit ? 'edit-name' : 'name'}
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Nombre de la etiqueta"
        />
      </div>
      
      <div>
        <Label htmlFor={isEdit ? 'edit-category' : 'category'}>Categoría</Label>
        <Select 
          value={formData.category} 
          onValueChange={(value: any) => handleChange('category', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAG_CATEGORIES.map(category => (
              <SelectItem key={category.value} value={category.value}>
                {category.icon} {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor={isEdit ? 'edit-color' : 'color'}>Color</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {TAG_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                formData.color === color ? 'border-gray-900 ring-2 ring-gray-300' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleChange('color', color)}
              title={`Seleccionar color ${color}`}
            />
          ))}
        </div>
      </div>
      
      <div>
        <Label htmlFor={isEdit ? 'edit-description' : 'description'}>Descripción (opcional)</Label>
        <Textarea
          id={isEdit ? 'edit-description' : 'description'}
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Descripción de la etiqueta"
          rows={3}
        />
      </div>
    </div>
  );
}