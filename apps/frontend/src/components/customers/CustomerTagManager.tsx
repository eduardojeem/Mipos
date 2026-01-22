'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Tag, Palette } from 'lucide-react';
import { customerService, CustomerTag } from '@/lib/customer-service';

interface CustomerTagManagerProps {
  selectedTags?: string[];
  onTagsChange?: (tagIds: string[]) => void;
  mode?: 'select' | 'manage';
}

const predefinedColors = [
  '#FFD700', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', 
  '#00BCD4', '#FF9800', '#795548', '#607D8B', '#E91E63'
];

export default function CustomerTagManager({ 
  selectedTags = [], 
  onTagsChange, 
  mode = 'select' 
}: CustomerTagManagerProps) {
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<CustomerTag | null>(null);
  const [newTag, setNewTag] = useState({
    name: '',
    color: predefinedColors[0],
    description: ''
  });

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = () => {
    const availableTags = customerService.getAvailableTags();
    setTags(availableTags);
  };

  const handleCreateTag = () => {
    if (!newTag.name.trim()) return;

    const createdTag = customerService.createTag({
      name: newTag.name,
      color: newTag.color,
      description: newTag.description
    });

    setTags([...tags, createdTag]);
    setNewTag({ name: '', color: predefinedColors[0], description: '' });
    setIsCreateDialogOpen(false);
  };

  const handleTagToggle = (tagId: string) => {
    if (!onTagsChange) return;

    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    
    onTagsChange(newSelectedTags);
  };

  const resetForm = () => {
    setNewTag({ name: '', color: predefinedColors[0], description: '' });
    setEditingTag(null);
  };

  if (mode === 'select') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Etiquetas</Label>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nueva Etiqueta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Etiqueta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tag-name">Nombre</Label>
                  <Input
                    id="tag-name"
                    value={newTag.name}
                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                    placeholder="Nombre de la etiqueta"
                  />
                </div>
                <div>
                  <Label htmlFor="tag-color">Color</Label>
                  <div className="flex gap-2 mt-2">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          newTag.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTag({ ...newTag, color })}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="tag-description">Descripción</Label>
                  <Textarea
                    id="tag-description"
                    value={newTag.description}
                    onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                    placeholder="Descripción de la etiqueta"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateTag}>
                    Crear Etiqueta
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant={selectedTags.includes(tag.id) ? "default" : "outline"}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent',
                borderColor: tag.color,
                color: selectedTags.includes(tag.id) ? '#fff' : tag.color
              }}
              onClick={() => handleTagToggle(tag.id)}
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag.name}
            </Badge>
          ))}
        </div>

        {selectedTags.length > 0 && (
          <div className="text-sm text-gray-600">
            {selectedTags.length} etiqueta{selectedTags.length !== 1 ? 's' : ''} seleccionada{selectedTags.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Gestión de Etiquetas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Gestiona las etiquetas personalizadas para categorizar clientes
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Etiqueta
                </Button>
              </DialogTrigger>
              <DialogContent aria-labelledby="manage-tag-title">
                <DialogHeader>
                  <DialogTitle id="manage-tag-title">
                    {editingTag ? 'Editar Etiqueta' : 'Crear Nueva Etiqueta'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tag-name">Nombre</Label>
                    <Input
                      id="tag-name"
                      value={newTag.name}
                      onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                      placeholder="Nombre de la etiqueta"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tag-color">Color</Label>
                    <div className="flex gap-2 mt-2">
                      {predefinedColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            newTag.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTag({ ...newTag, color })}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="tag-description">Descripción</Label>
                    <Textarea
                      id="tag-description"
                      value={newTag.description}
                      onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                      placeholder="Descripción de la etiqueta"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                    }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateTag}>
                      {editingTag ? 'Actualizar' : 'Crear'} Etiqueta
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div>
                    <h4 className="font-medium">{tag.name}</h4>
                    {tag.description && (
                      <p className="text-sm text-gray-600">{tag.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTag(tag);
                      setNewTag({
                        name: tag.name,
                        color: tag.color,
                        description: tag.description || ''
                      });
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {tags.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay etiquetas creadas</p>
              <p className="text-sm">Crea tu primera etiqueta para comenzar</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}