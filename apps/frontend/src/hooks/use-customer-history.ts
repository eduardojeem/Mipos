'use client';

import { useState, useCallback } from 'react';
import { useAuth } from './use-auth';
import { createClient } from '@/lib/supabase';

// Types
export interface HistoryEvent {
  id: string;
  sourceType: 'event' | 'interaction' | 'note';
  type: string;
  title: string;
  description?: string;
  amount?: number;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerInteraction {
  id: string;
  customerId: string;
  interactionType: 'call' | 'email' | 'sms' | 'visit' | 'complaint' | 'inquiry' | 'feedback';
  channel: 'phone' | 'email' | 'in_person' | 'whatsapp' | 'website';
  subject: string;
  content?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  outcome?: string;
  followUpDate?: string;
  tags?: string[];
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  noteType: 'general' | 'important' | 'warning' | 'preference' | 'complaint';
  title?: string;
  content: string;
  isPrivate: boolean;
  isImportant: boolean;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPreferences {
  id: string;
  customerId: string;
  communicationPreferences?: {
    email: boolean;
    sms: boolean;
    phone: boolean;
    whatsapp: boolean;
    marketing: boolean;
    promotions: boolean;
    reminders: boolean;
  };
  purchasePreferences?: {
    preferredPaymentMethod?: string;
    preferredDeliveryTime?: string;
    specialInstructions?: string;
    discountPreferences?: string[];
  };
  servicePreferences?: {
    preferredStaff?: string;
    serviceLevel?: string;
    specialNeeds?: string[];
  };
  privacySettings?: {
    dataSharing: boolean;
    marketingConsent: boolean;
    analyticsTracking: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAnalytics {
  analytics: {
    total_events: number;
    total_purchases: number;
    total_returns: number;
    total_communications: number;
    total_spent: number;
    avg_purchase_amount: number;
    first_event: string;
    last_event: string;
    last_purchase: string;
  };
  interactionStats: {
    total_interactions: number;
    completed_interactions: number;
    high_priority_interactions: number;
  };
  noteStats: {
    total_notes: number;
    important_notes: number;
  };
}

export interface TimelineResponse {
  customer: {
    id: string;
    name: string;
  };
  timeline: HistoryEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TimelineFilters {
  page?: number;
  limit?: number;
  eventType?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AddEventData {
  customerId: string;
  eventType: 'purchase' | 'return' | 'payment' | 'credit' | 'loyalty' | 'profile_update' | 'note' | 'communication';
  title: string;
  description?: string;
  amount?: number;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, any>;
}

export interface AddInteractionData {
  customerId: string;
  interactionType: 'call' | 'email' | 'sms' | 'visit' | 'complaint' | 'inquiry' | 'feedback';
  channel: 'phone' | 'email' | 'in_person' | 'whatsapp' | 'website';
  subject: string;
  content?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  outcome?: string;
  followUpDate?: string;
  tags?: string[];
  assignedTo?: string;
}

export interface AddNoteData {
  customerId: string;
  noteType?: 'general' | 'important' | 'warning' | 'preference' | 'complaint';
  title?: string;
  content: string;
  isPrivate?: boolean;
  isImportant?: boolean;
  tags?: string[];
}

export function useCustomerHistory(customerId: string) {
  const { user } = useAuth();
  const supabase = createClient();
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [interactions, setInteractions] = useState<CustomerInteraction[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [preferences, setPreferences] = useState<CustomerPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer-history${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    return response.json();
  }, [supabase]);

  // Fetch timeline with filters
  const fetchTimeline = useCallback(async (filters: TimelineFilters = {}) => {
    if (!customerId) return;

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const data = await apiCall(`/${customerId}/timeline?${queryParams.toString()}`);
      setTimeline(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  }, [customerId, apiCall]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    if (!customerId) return;

    try {
      const data = await apiCall(`/${customerId}/analytics`);
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  }, [customerId, apiCall]);

  // Fetch interactions
  const fetchInteractions = useCallback(async (filters: TimelineFilters = {}) => {
    if (!customerId) return;

    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const data = await apiCall(`/${customerId}/interactions?${queryParams.toString()}`);
      setInteractions(data.interactions || []);
    } catch (err) {
      console.error('Error fetching interactions:', err);
    }
  }, [customerId, apiCall]);

  // Fetch notes
  const fetchNotes = useCallback(async (filters: TimelineFilters = {}) => {
    if (!customerId) return;

    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const data = await apiCall(`/${customerId}/notes?${queryParams.toString()}`);
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  }, [customerId, apiCall]);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!customerId) return;

    try {
      const data = await apiCall(`/${customerId}/preferences`);
      setPreferences(data.preferences);
    } catch (err) {
      console.error('Error fetching preferences:', err);
    }
  }, [customerId, apiCall]);

  // Add event
  const addEvent = useCallback(async (eventData: AddEventData) => {
    try {
      await apiCall('/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
      return { success: true };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Error al agregar evento');
    }
  }, [apiCall]);

  // Add interaction
  const addInteraction = useCallback(async (interactionData: AddInteractionData) => {
    try {
      await apiCall('/interactions', {
        method: 'POST',
        body: JSON.stringify(interactionData),
      });
      return { success: true };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Error al agregar interacción');
    }
  }, [apiCall]);

  // Add note
  const addNote = useCallback(async (noteData: AddNoteData) => {
    try {
      await apiCall('/notes', {
        method: 'POST',
        body: JSON.stringify(noteData),
      });
      return { success: true };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Error al agregar nota');
    }
  }, [apiCall]);

  // Update preferences
  const updatePreferences = useCallback(async (preferencesData: Partial<CustomerPreferences>) => {
    if (!customerId) return;

    try {
      await apiCall(`/${customerId}/preferences`, {
        method: 'PUT',
        body: JSON.stringify(preferencesData),
      });
      
      // Refresh preferences
      await fetchPreferences();
      return { success: true };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Error al actualizar preferencias');
    }
  }, [customerId, apiCall, fetchPreferences]);

  return {
    // Data
    timeline,
    analytics,
    interactions,
    notes,
    preferences,
    
    // State
    loading,
    error,
    
    // Actions
    fetchTimeline,
    fetchAnalytics,
    fetchInteractions,
    fetchNotes,
    fetchPreferences,
    addEvent,
    addInteraction,
    addNote,
    updatePreferences,
  };
}

export default useCustomerHistory;