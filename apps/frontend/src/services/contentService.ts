interface ContentItem {
  id: string;
  title: string;
  description?: string;
  content?: string;
  type: 'page' | 'banner' | 'media';
  status: 'published' | 'draft' | 'archived';
  tags?: string[];
  category?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  author?: string;
  views?: number;
}

interface ContentFilters {
  type?: string;
  status?: string;
  category?: string;
  search?: string;
}

interface CreateContentData {
  title: string;
  description?: string;
  content?: string;
  type: 'page' | 'banner' | 'media';
  status?: 'published' | 'draft' | 'archived';
  tags?: string[];
  category?: string;
  metadata?: Record<string, any>;
}

interface UpdateContentData extends Partial<CreateContentData> {
  id: string;
}

class ContentService {
  private baseUrl = '/api/content';

  async getContent(filters: ContentFilters = {}): Promise<ContentItem[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.append(key, value);
      }
    });

    const url = `${this.baseUrl}${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch content');
    }
    
    const result = await response.json();
    return result.data || [];
  }

  async getContentById(id: string): Promise<ContentItem> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch content item');
    }
    
    const result = await response.json();
    return result.data;
  }

  async createContent(data: CreateContentData): Promise<ContentItem> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create content');
    }
    
    const result = await response.json();
    return result.data;
  }

  async updateContent(data: UpdateContentData): Promise<ContentItem> {
    const { id, ...updateData } = data;
    
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update content');
    }
    
    const result = await response.json();
    return result.data;
  }

  async deleteContent(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete content');
    }
  }

  async duplicateContent(id: string): Promise<ContentItem> {
    const original = await this.getContentById(id);
    
    const duplicateData: CreateContentData = {
      title: `${original.title} (Copia)`,
      description: original.description,
      content: original.content,
      type: original.type,
      status: 'draft',
      tags: original.tags,
      category: original.category,
      metadata: original.metadata,
    };
    
    return this.createContent(duplicateData);
  }
}

export const contentService = new ContentService();
export type { ContentItem, ContentFilters, CreateContentData, UpdateContentData };