import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';

// Etiquetas en español para los enums (almacenados en MAYÚSCULA).
const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CREDIT: 'Crédito',
  OTHER: 'Otro',
};
const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completado',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

/**
 * GET /api/sales/export?limit=100&format=excel
 * Exporta las ventas recientes de la organización del usuario a Excel/CSV.
 * Multi-tenant: usa el cliente con RLS (solo ve ventas de su organización) y
 * requiere sesión.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10), 1), 1000);
    const format = (searchParams.get('format') || 'excel').toLowerCase();

    const supabase = await createClient();

    // Requiere usuario autenticado (RLS scopea por organización).
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: sales, error } = await supabase
      .from('sales')
      .select('id, total, payment_method, status, created_at, customer:customers(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const rows = (sales || []).map((sale: any) => ({
      'ID': sale.id,
      'Fecha': new Date(sale.created_at).toLocaleString('es-PY'),
      'Cliente': sale.customer?.name || 'Consumidor Final',
      'Método de pago': PAYMENT_LABELS[sale.payment_method] || sale.payment_method || '—',
      'Estado': STATUS_LABELS[sale.status] || sale.status || '—',
      'Total': Number(sale.total) || 0,
    }));

    const dateStr = new Date().toISOString().split('T')[0];

    // CSV
    if (format === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return new NextResponse('﻿' + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ventas-recientes-${dateStr}.csv"`,
        },
      });
    }

    // Excel (default)
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 38 }, { wch: 20 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="ventas-recientes-${dateStr}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Sales export error:', error);
    return NextResponse.json({ error: 'No se pudieron exportar las ventas' }, { status: 500 });
  }
}
