'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, 
  Download, 
  Printer, 
  Plus, 
  Trash2, 
  Calculator,
  User,
  Building,
  Calendar,
  Hash,
  DollarSign,
  Eye,
  Send,
  Save
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import usePrint from '@/hooks/usePrint';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  taxId?: string;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  customer: Customer;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
}

const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@email.com',
    address: 'Calle Principal 123, Ciudad',
    phone: '+1234567890',
    taxId: '12345678-9'
  },
  {
    id: '2',
    name: 'María García',
    email: 'maria@email.com',
    address: 'Avenida Central 456, Ciudad',
    phone: '+0987654321',
    taxId: '98765432-1'
  }
];

export function InvoiceGenerator() {
  const [invoice, setInvoice] = useState<Invoice>({
    id: '',
    number: `INV-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customer: mockCustomers[0],
    items: [
      {
        id: '1',
        description: 'Producto de ejemplo',
        quantity: 1,
        unitPrice: 100,
        total: 100
      }
    ],
    subtotal: 100,
    tax: 19,
    discount: 0,
    total: 119,
    status: 'draft',
    notes: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  // Initialize printing hook once at component top-level
  const { printRef, handlePrint } = usePrint();
  // Share the same DOM element between invoiceRef (for PDF) and printRef (for printing)
  const setInvoiceRefs = (el: HTMLDivElement | null) => {
    invoiceRef.current = el;
    (printRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (itemId: string) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
    calculateTotals();
  };

  const updateItem = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      })
    }));
    setTimeout(calculateTotals, 0);
  };

  const calculateTotals = () => {
    setInvoice(prev => {
      const subtotal = prev.items.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = (subtotal - prev.discount) * (prev.tax / 100);
      const total = subtotal - prev.discount + taxAmount;
      
      return {
        ...prev,
        subtotal,
        total
      };
    });
  };

  const generatePDF = async () => {
    if (!invoiceRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`factura-${invoice.number}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const printInvoice = () => {
    handlePrint();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Sistema de Facturación</h1>
            <Badge variant="secondary" className="bg-gradient-to-r from-green-100 to-blue-100 text-green-800">
              <Calculator className="w-3 h-3 mr-1" />
              Automático
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Generación automática de facturas con PDFs profesionales
          </p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={printInvoice}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating}>
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generando...' : 'Descargar PDF'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulario de edición */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer">Cliente</Label>
                <Select
                  value={invoice.customer.id}
                  onValueChange={(value) => {
                    const customer = mockCustomers.find(c => c.id === value);
                    if (customer) {
                      setInvoice(prev => ({ ...prev, customer }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCustomers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Detalles de Factura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="number">Número de Factura</Label>
                <Input
                  id="number"
                  value={invoice.number}
                  onChange={(e) => setInvoice(prev => ({ ...prev, number: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={invoice.date}
                  onChange={(e) => setInvoice(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={invoice.dueDate}
                  onChange={(e) => setInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="tax">IVA (%)</Label>
                <Input
                  id="tax"
                  type="number"
                  value={invoice.tax}
                  onChange={(e) => {
                    setInvoice(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }));
                    setTimeout(calculateTotals, 0);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="discount">Descuento</Label>
                <Input
                  id="discount"
                  type="number"
                  value={invoice.discount}
                  onChange={(e) => {
                    setInvoice(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }));
                    setTimeout(calculateTotals, 0);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos/Servicios</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={addItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Ítem
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Vista previa de la factura */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div ref={setInvoiceRefs} className="bg-white p-8 text-black">
                {/* Header de la factura */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">FACTURA</h1>
                    <p className="text-gray-600">#{invoice.number}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">Mi Empresa</div>
                    <p className="text-gray-600">Dirección de la empresa</p>
                    <p className="text-gray-600">Teléfono: +123456789</p>
                    <p className="text-gray-600">email@empresa.com</p>
                  </div>
                </div>

                {/* Información del cliente y fechas */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Facturar a:</h3>
                    <div className="text-gray-600">
                      <p className="font-medium">{invoice.customer.name}</p>
                      <p>{invoice.customer.address}</p>
                      <p>{invoice.customer.phone}</p>
                      <p>{invoice.customer.email}</p>
                      {invoice.customer.taxId && <p>NIT: {invoice.customer.taxId}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mb-2">
                      <span className="font-semibold text-gray-800">Fecha: </span>
                      <span className="text-gray-600">{new Date(invoice.date).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">Vencimiento: </span>
                      <span className="text-gray-600">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Tabla de productos */}
                <div className="mb-8">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-2 font-semibold text-gray-800">Descripción</th>
                        <th className="text-center py-2 font-semibold text-gray-800">Cantidad</th>
                        <th className="text-right py-2 font-semibold text-gray-800">Precio Unit.</th>
                        <th className="text-right py-2 font-semibold text-gray-800">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={item.id} className="border-b border-gray-200">
                          <td className="py-2 text-gray-700">
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              className="border-none p-0 bg-transparent"
                              placeholder="Descripción del producto/servicio"
                            />
                          </td>
                          <td className="py-2 text-center">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="border-none p-0 bg-transparent text-center w-16"
                            />
                          </td>
                          <td className="py-2 text-right">
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="border-none p-0 bg-transparent text-right w-24"
                            />
                          </td>
                          <td className="py-2 text-right font-medium">
                            ${item.total.toFixed(2)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="ml-2 h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totales */}
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    {invoice.discount > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600">Descuento:</span>
                        <span className="font-medium">-${invoice.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">IVA ({invoice.tax}%):</span>
                      <span className="font-medium">${((invoice.subtotal - invoice.discount) * (invoice.tax / 100)).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-300 mt-2 pt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-bold text-gray-800">Total:</span>
                        <span className="text-lg font-bold text-blue-600">${invoice.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notas */}
                <div className="mt-8">
                  <h4 className="font-semibold text-gray-800 mb-2">Notas:</h4>
                  <Textarea
                    value={invoice.notes}
                    onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Términos y condiciones, notas adicionales..."
                    className="border-none p-0 bg-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
                  <p>Gracias por su preferencia</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}