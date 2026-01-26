'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  Bookmark,
  Calendar,
  MapPin,
  DollarSign,
  Star,
  Building,
  Phone,
  Mail,
  Globe,
  Tag,
  TrendingUp,
  Users,
  Package
} from 'lucide-react';
import api from '@/lib/api';
import { createLogger } from '@/lib/logger';

// Types
interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  website?: string;
  address: string;
  city: string;
  country: string;
  category: string;
  status: 'active' | 'inactive' | 'pending';
  rating: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  createdAt: string;
  tags: string[];
  paymentTerms: string;
  creditLimit: number;
  discount: number;
  performanceScore: number;
}

interface SearchFilters {
  query: string;
  categories: string[];
  statuses: string[];
  countries: string[];
  cities: string[];
  tags: string[];
  ratingMin: number;
  ratingMax: number;
  totalSpentMin: number;
  totalSpentMax: number;
  totalOrdersMin: number;
  totalOrdersMax: number;
  performanceScoreMin: number;
  performanceScoreMax: number;
  creditLimitMin: number;
  creditLimitMax: number;
  discountMin: number;
  discountMax: number;
  lastOrderDateFrom: string;
  lastOrderDateTo: string;
  createdAtFrom: string;
  createdAtTo: string;
  paymentTerms: string[];
  hasWebsite: boolean | null;
  hasPhone: boolean | null;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
}

const initialFilters: SearchFilters = {
  query: '',
  categories: [],
  statuses: [],
  countries: [],
  cities: [],
  tags: [],
  ratingMin: 0,
  ratingMax: 5,
  totalSpentMin: 0,
  totalSpentMax: 1000000,
  totalOrdersMin: 0,
  totalOrdersMax: 1000,
  performanceScoreMin: 0,
  performanceScoreMax: 100,
  creditLimitMin: 0,
  creditLimitMax: 100000,
  discountMin: 0,
  discountMax: 50,
  lastOrderDateFrom: '',
  lastOrderDateTo: '',
  createdAtFrom: '',
  createdAtTo: '',
  paymentTerms: [],
  hasWebsite: null,
  hasPhone: null
};

const logger = createLogger('SupplierSearch');

export default function AdvancedSearchPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');

  // Filter options
  const [categories, setCategories] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [paymentTermsOptions, setPaymentTermsOptions] = useState<string[]>([]);

  // UI State
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    location: false,
    financial: false,
    performance: false,
    dates: false,
    advanced: false
  });

  // Load initial data
  useEffect(() => {
    loadFilterOptions();
    loadSavedSearches();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const response = await api.get('/suppliers/search/options');
      setCategories(response.data.categories || ['Tecnología', 'Materiales', 'Servicios', 'Equipos']);
      setCountries(response.data.countries || ['México', 'Estados Unidos', 'Canadá', 'España']);
      setCities(response.data.cities || ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla']);
      setAvailableTags(response.data.tags || ['Premium', 'Local', 'Estratégico', 'Nuevo']);
      setPaymentTermsOptions(response.data.paymentTerms || ['Contado', '30 días', '60 días', '90 días']);
    } catch (error) {
      logger.error('Error loading filter options:', error);
    }
  };

  const loadSavedSearches = async () => {
    try {
      const response = await api.get('/suppliers/search/saved');
      setSavedSearches(response.data || []);
    } catch (error) {
      logger.error('Error loading saved searches:', error);
      // Mock data
      setSavedSearches([
        {
          id: '1',
          name: 'Proveedores Premium Activos',
          filters: { ...initialFilters, tags: ['Premium'], statuses: ['active'] },
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          name: 'Proveedores Locales',
          filters: { ...initialFilters, countries: ['México'], cities: ['Ciudad de México'] },
          createdAt: '2024-01-10'
        }
      ]);
    }
  };

  // Search function
  const performSearch = async () => {
    setLoading(true);
    try {
      const response = await api.post('/suppliers/search', { filters });
      setSuppliers(response.data.suppliers || []);
    } catch (error) {
      logger.error('Error performing search:', error);
      toast({
        title: 'Error',
        description: 'No se pudo realizar la búsqueda',
        variant: 'destructive',
      });

      // Mock data for development
      setSuppliers([
        {
          id: '1',
          name: 'TechSupply Corp',
          email: 'contact@techsupply.com',
          phone: '+52 55 1234 5678',
          website: 'https://techsupply.com',
          address: 'Av. Reforma 123',
          city: 'Ciudad de México',
          country: 'México',
          category: 'Tecnología',
          status: 'active',
          rating: 4.8,
          totalOrders: 45,
          totalSpent: 450000,
          lastOrderDate: '2024-01-15',
          createdAt: '2023-06-01',
          tags: ['Premium', 'Estratégico'],
          paymentTerms: '30 días',
          creditLimit: 50000,
          discount: 15,
          performanceScore: 95
        },
        {
          id: '2',
          name: 'Local Materials',
          email: 'info@localmaterials.com',
          phone: '+52 33 9876 5432',
          address: 'Calle Industrial 456',
          city: 'Guadalajara',
          country: 'México',
          category: 'Materiales',
          status: 'active',
          rating: 4.2,
          totalOrders: 28,
          totalSpent: 280000,
          lastOrderDate: '2024-01-12',
          createdAt: '2023-08-15',
          tags: ['Local'],
          paymentTerms: '60 días',
          creditLimit: 30000,
          discount: 8,
          performanceScore: 82
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Filter suppliers based on current filters
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      // Text search
      if (filters.query) {
        const query = filters.query.toLowerCase();
        const searchableText = [
          supplier.name,
          supplier.email,
          supplier.phone,
          supplier.address,
          supplier.city,
          supplier.country,
          supplier.category,
          ...supplier.tags
        ].join(' ').toLowerCase();

        if (!searchableText.includes(query)) return false;
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(supplier.category)) {
        return false;
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(supplier.status)) {
        return false;
      }

      // Country filter
      if (filters.countries.length > 0 && !filters.countries.includes(supplier.country)) {
        return false;
      }

      // City filter
      if (filters.cities.length > 0 && !filters.cities.includes(supplier.city)) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0 && !filters.tags.some(tag => supplier.tags.includes(tag))) {
        return false;
      }

      // Rating filter
      if (supplier.rating < filters.ratingMin || supplier.rating > filters.ratingMax) {
        return false;
      }

      // Total spent filter
      if (supplier.totalSpent < filters.totalSpentMin || supplier.totalSpent > filters.totalSpentMax) {
        return false;
      }

      // Total orders filter
      if (supplier.totalOrders < filters.totalOrdersMin || supplier.totalOrders > filters.totalOrdersMax) {
        return false;
      }

      // Performance score filter
      if (supplier.performanceScore < filters.performanceScoreMin || supplier.performanceScore > filters.performanceScoreMax) {
        return false;
      }

      // Credit limit filter
      if (supplier.creditLimit < filters.creditLimitMin || supplier.creditLimit > filters.creditLimitMax) {
        return false;
      }

      // Discount filter
      if (supplier.discount < filters.discountMin || supplier.discount > filters.discountMax) {
        return false;
      }

      // Payment terms filter
      if (filters.paymentTerms.length > 0 && !filters.paymentTerms.includes(supplier.paymentTerms)) {
        return false;
      }

      // Website filter
      if (filters.hasWebsite !== null) {
        const hasWebsite = !!supplier.website;
        if (filters.hasWebsite !== hasWebsite) return false;
      }

      // Phone filter
      if (filters.hasPhone !== null) {
        const hasPhone = !!supplier.phone;
        if (filters.hasPhone !== hasPhone) return false;
      }

      // Date filters
      if (filters.lastOrderDateFrom && new Date(supplier.lastOrderDate) < new Date(filters.lastOrderDateFrom)) {
        return false;
      }
      if (filters.lastOrderDateTo && new Date(supplier.lastOrderDate) > new Date(filters.lastOrderDateTo)) {
        return false;
      }
      if (filters.createdAtFrom && new Date(supplier.createdAt) < new Date(filters.createdAtFrom)) {
        return false;
      }
      if (filters.createdAtTo && new Date(supplier.createdAt) > new Date(filters.createdAtTo)) {
        return false;
      }

      return true;
    });
  }, [suppliers, filters]);

  // Handlers
  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleArrayFilterChange = (key: keyof SearchFilters, value: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: checked
        ? [...(prev[key] as string[]), value]
        : (prev[key] as string[]).filter(item => item !== value)
    }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const saveSearch = async () => {
    if (!searchName.trim()) return;

    try {
      const newSearch: SavedSearch = {
        id: Date.now().toString(),
        name: searchName,
        filters: { ...filters },
        createdAt: new Date().toISOString()
      };

      await api.post('/suppliers/search/save', newSearch);
      setSavedSearches([...savedSearches, newSearch]);
      setShowSaveDialog(false);
      setSearchName('');

      toast({
        title: 'Éxito',
        description: 'Búsqueda guardada correctamente',
      });
    } catch (error) {
      logger.error('Error saving search:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la búsqueda',
        variant: 'destructive',
      });
    }
  };

  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setFilters(savedSearch.filters);
    toast({
      title: 'Búsqueda cargada',
      description: `Se cargó la búsqueda "${savedSearch.name}"`,
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Auto-search when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (Object.values(filters).some(value =>
        Array.isArray(value) ? value.length > 0 : value !== initialFilters[Object.keys(filters).find(k => filters[k as keyof SearchFilters] === value) as keyof SearchFilters]
      )) {
        performSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Búsqueda Avanzada</h1>
          <p className="text-muted-foreground">
            Encuentra proveedores con filtros complejos y búsqueda semántica
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Búsqueda
          </Button>
          <Button variant="outline" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpiar Filtros
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Filtros de Búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Search */}
              <Collapsible open={expandedSections.basic} onOpenChange={() => toggleSection('basic')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
                  <span className="font-medium">Búsqueda Básica</span>
                  {expandedSections.basic ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  <div>
                    <Label>Búsqueda de texto</Label>
                    <Input
                      placeholder="Buscar por nombre, email, dirección..."
                      value={filters.query}
                      onChange={(e) => handleFilterChange('query', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Categorías</Label>
                    <div className="space-y-2 mt-2">
                      {categories.map(category => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={filters.categories.includes(category)}
                            onCheckedChange={(checked) =>
                              handleArrayFilterChange('categories', category, checked as boolean)
                            }
                          />
                          <Label htmlFor={`category-${category}`} className="text-sm">{category}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Estado</Label>
                    <div className="space-y-2 mt-2">
                      {['active', 'inactive', 'pending'].map(status => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={filters.statuses.includes(status)}
                            onCheckedChange={(checked) =>
                              handleArrayFilterChange('statuses', status, checked as boolean)
                            }
                          />
                          <Label htmlFor={`status-${status}`} className="text-sm capitalize">{status}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Location Filters */}
              <Collapsible open={expandedSections.location} onOpenChange={() => toggleSection('location')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
                  <span className="font-medium">Ubicación</span>
                  {expandedSections.location ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  <div>
                    <Label>Países</Label>
                    <div className="space-y-2 mt-2">
                      {countries.map(country => (
                        <div key={country} className="flex items-center space-x-2">
                          <Checkbox
                            id={`country-${country}`}
                            checked={filters.countries.includes(country)}
                            onCheckedChange={(checked) =>
                              handleArrayFilterChange('countries', country, checked as boolean)
                            }
                          />
                          <Label htmlFor={`country-${country}`} className="text-sm">{country}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Ciudades</Label>
                    <div className="space-y-2 mt-2">
                      {cities.map(city => (
                        <div key={city} className="flex items-center space-x-2">
                          <Checkbox
                            id={`city-${city}`}
                            checked={filters.cities.includes(city)}
                            onCheckedChange={(checked) =>
                              handleArrayFilterChange('cities', city, checked as boolean)
                            }
                          />
                          <Label htmlFor={`city-${city}`} className="text-sm">{city}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Financial Filters */}
              <Collapsible open={expandedSections.financial} onOpenChange={() => toggleSection('financial')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
                  <span className="font-medium">Financiero</span>
                  {expandedSections.financial ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  <div>
                    <Label>Total Gastado (Min - Max)</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.totalSpentMin}
                        onChange={(e) => handleFilterChange('totalSpentMin', Number(e.target.value))}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.totalSpentMax}
                        onChange={(e) => handleFilterChange('totalSpentMax', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Límite de Crédito (Min - Max)</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.creditLimitMin}
                        onChange={(e) => handleFilterChange('creditLimitMin', Number(e.target.value))}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.creditLimitMax}
                        onChange={(e) => handleFilterChange('creditLimitMax', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Descuento % (Min - Max)</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.discountMin}
                        onChange={(e) => handleFilterChange('discountMin', Number(e.target.value))}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.discountMax}
                        onChange={(e) => handleFilterChange('discountMax', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Términos de Pago</Label>
                    <div className="space-y-2 mt-2">
                      {paymentTermsOptions.map(term => (
                        <div key={term} className="flex items-center space-x-2">
                          <Checkbox
                            id={`payment-${term}`}
                            checked={filters.paymentTerms.includes(term)}
                            onCheckedChange={(checked) =>
                              handleArrayFilterChange('paymentTerms', term, checked as boolean)
                            }
                          />
                          <Label htmlFor={`payment-${term}`} className="text-sm">{term}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Performance Filters */}
              <Collapsible open={expandedSections.performance} onOpenChange={() => toggleSection('performance')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
                  <span className="font-medium">Rendimiento</span>
                  {expandedSections.performance ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  <div>
                    <Label>Calificación (Min - Max)</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        placeholder="Min"
                        value={filters.ratingMin}
                        onChange={(e) => handleFilterChange('ratingMin', Number(e.target.value))}
                      />
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        placeholder="Max"
                        value={filters.ratingMax}
                        onChange={(e) => handleFilterChange('ratingMax', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Score de Rendimiento (Min - Max)</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Min"
                        value={filters.performanceScoreMin}
                        onChange={(e) => handleFilterChange('performanceScoreMin', Number(e.target.value))}
                      />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Max"
                        value={filters.performanceScoreMax}
                        onChange={(e) => handleFilterChange('performanceScoreMax', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Total de Órdenes (Min - Max)</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.totalOrdersMin}
                        onChange={(e) => handleFilterChange('totalOrdersMin', Number(e.target.value))}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.totalOrdersMax}
                        onChange={(e) => handleFilterChange('totalOrdersMax', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Advanced Filters */}
              <Collapsible open={expandedSections.advanced} onOpenChange={() => toggleSection('advanced')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
                  <span className="font-medium">Avanzado</span>
                  {expandedSections.advanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  <div>
                    <Label>Etiquetas</Label>
                    <div className="space-y-2 mt-2">
                      {availableTags.map(tag => (
                        <div key={tag} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag}`}
                            checked={filters.tags.includes(tag)}
                            onCheckedChange={(checked) =>
                              handleArrayFilterChange('tags', tag, checked as boolean)
                            }
                          />
                          <Label htmlFor={`tag-${tag}`} className="text-sm">{tag}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Contacto</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has-website"
                          checked={filters.hasWebsite === true}
                          onCheckedChange={(checked) =>
                            handleFilterChange('hasWebsite', checked ? true : null)
                          }
                        />
                        <Label htmlFor="has-website" className="text-sm">Tiene sitio web</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has-phone"
                          checked={filters.hasPhone === true}
                          onCheckedChange={(checked) =>
                            handleFilterChange('hasPhone', checked ? true : null)
                          }
                        />
                        <Label htmlFor="has-phone" className="text-sm">Tiene teléfono</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Fecha de Última Orden</Label>
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={filters.lastOrderDateFrom}
                        onChange={(e) => handleFilterChange('lastOrderDateFrom', e.target.value)}
                      />
                      <Input
                        type="date"
                        value={filters.lastOrderDateTo}
                        onChange={(e) => handleFilterChange('lastOrderDateTo', e.target.value)}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bookmark className="mr-2 h-4 w-4" />
                  Búsquedas Guardadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {savedSearches.map(savedSearch => (
                    <Button
                      key={savedSearch.id}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => loadSavedSearch(savedSearch)}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      {savedSearch.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resultados de Búsqueda</CardTitle>
                  <CardDescription>
                    {loading ? 'Buscando...' : `${filteredSuppliers.length} proveedores encontrados`}
                  </CardDescription>
                </div>
                {filteredSuppliers.length > 0 && (
                  <Button variant="outline" size="sm">
                    Exportar Resultados
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredSuppliers.length > 0 ? (
                <div className="space-y-4">
                  {filteredSuppliers.map(supplier => (
                    <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-3">
                              <h3 className="text-lg font-semibold">{supplier.name}</h3>
                              <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                                {supplier.status}
                              </Badge>
                              <Badge variant="outline">{supplier.category}</Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{supplier.email}</span>
                              </div>
                              {supplier.phone && (
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{supplier.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{supplier.city}, {supplier.country}</span>
                              </div>
                              {supplier.website && (
                                <div className="flex items-center space-x-2">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    Sitio web
                                  </a>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span>{supplier.rating}/5</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span>{supplier.totalOrders} órdenes</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span>${supplier.totalSpent.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <span>Score: {supplier.performanceScore}</span>
                              </div>
                            </div>

                            {supplier.tags.length > 0 && (
                              <div className="flex items-center space-x-2 mt-3">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                                <div className="flex flex-wrap gap-1">
                                  {supplier.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No se encontraron proveedores</h3>
                  <p className="text-muted-foreground">
                    Intenta ajustar los filtros de búsqueda para obtener más resultados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Guardar Búsqueda</CardTitle>
              <CardDescription>
                Dale un nombre a esta búsqueda para acceder rápidamente más tarde
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Nombre de la búsqueda"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </CardContent>
            <div className="flex justify-end space-x-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={saveSearch} disabled={!searchName.trim()}>
                Guardar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}