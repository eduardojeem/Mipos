import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import {
  mapCustomerTypeToDb,
  resolveCustomerOrganizationId,
  sanitizeNullableText,
  transformCustomerRecord,
} from '@/app/api/customers/_lib';

/**
 * Individual Customer API - Phase 5 Optimization
 * 
 * Handles individual customer operations: GET, PUT, DELETE
 * Optimized for performance with proper validation and business logic.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CASHIER']
    });
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();
    const { id } = await params;
    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);

    if (!id || !orgId) {
      return NextResponse.json(
        { success: false, error: !id ? 'Customer ID is required' : 'Organization header missing' },
        { status: 400 }
      );
    }

    // Get customer with purchase history
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }
      throw new Error(error.message);
    }

    // Get purchase history
    const { data: purchaseHistory } = await supabase
      .from('sales')
      .select(`
        id,
        total,
        created_at,
        status,
        sale_items (
          quantity,
          unit_price,
          products (
            id,
            name
          )
        )
      `)
      .eq('customer_id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get appointments linked to this customer
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, service_id, staff_profile_id, start_at, end_at, status, price, notes')
      .eq('customer_id', id)
      .eq('organization_id', orgId)
      .order('start_at', { ascending: false });

    const appointmentRows = appointments || [];
    const serviceIds = Array.from(new Set(appointmentRows.map((appointment: any) => appointment.service_id).filter(Boolean)));
    const staffIds = Array.from(new Set(appointmentRows.map((appointment: any) => appointment.staff_profile_id).filter(Boolean)));

    const serviceMap = new Map<string, { name: string }>();
    if (serviceIds.length > 0) {
      const { data: services } = await supabase
        .from('services')
        .select('id, name')
        .in('id', serviceIds);

      for (const service of services || []) {
        serviceMap.set((service as any).id, { name: (service as any).name || 'Servicio' });
      }
    }

    const staffMap = new Map<string, { display_name: string | null }>();
    if (staffIds.length > 0) {
      const { data: staffProfiles } = await supabase
        .from('staff_profiles')
        .select('id, display_name')
        .in('id', staffIds);

      for (const staff of staffProfiles || []) {
        staffMap.set((staff as any).id, { display_name: (staff as any).display_name || null });
      }
    }

    const appointmentHistory = appointmentRows.slice(0, 10).map((appointment: any) => ({
      ...appointment,
      service: serviceMap.get(appointment.service_id) || null,
      staff: staffMap.get(appointment.staff_profile_id) || null,
    }));

    const nowIso = new Date().toISOString();
    const completedAppointments = appointmentRows.filter((appointment: any) => appointment.status === 'COMPLETED');
    const noShowCount = appointmentRows.filter((appointment: any) => appointment.status === 'NO_SHOW').length;
    const cancelledAppointments = appointmentRows.filter((appointment: any) => appointment.status === 'CANCELLED').length;
    const totalServiceRevenue = completedAppointments.reduce(
      (sum: number, appointment: any) => sum + (Number(appointment.price) || 0),
      0,
    );
    const nextAppointmentRow = [...appointmentRows]
      .filter((appointment: any) => appointment.start_at >= nowIso && ['BOOKED', 'CONFIRMED'].includes(String(appointment.status || '')))
      .sort((a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0];
    const lastCompletedAppointmentRow = completedAppointments[0];

    const activitySummary = {
      totalAppointments: appointmentRows.length,
      completedAppointments: completedAppointments.length,
      noShowCount,
      cancelledAppointments,
      totalServiceRevenue,
      totalCustomerValue: (Number(customer.total_purchases) || 0) + totalServiceRevenue,
      nextAppointment: nextAppointmentRow
        ? {
            id: nextAppointmentRow.id,
            date: nextAppointmentRow.start_at,
            status: nextAppointmentRow.status as 'BOOKED' | 'CONFIRMED',
            serviceName: serviceMap.get(nextAppointmentRow.service_id)?.name || 'Servicio',
            staffName: staffMap.get(nextAppointmentRow.staff_profile_id)?.display_name || null,
          }
        : null,
      lastCompletedAppointment: lastCompletedAppointmentRow
        ? {
            id: lastCompletedAppointmentRow.id,
            date: lastCompletedAppointmentRow.start_at,
            serviceName: serviceMap.get(lastCompletedAppointmentRow.service_id)?.name || 'Servicio',
            staffName: staffMap.get(lastCompletedAppointmentRow.staff_profile_id)?.display_name || null,
            price: Number(lastCompletedAppointmentRow.price) || 0,
          }
        : null,
    };

    const { data: loyaltyRow } = await supabase
      .from('customer_loyalty')
      .select('id, program_id, current_points, total_points_earned, total_points_redeemed, current_tier_id, enrollment_date, last_activity_date, updated_at')
      .eq('customer_id', id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let loyalty: any = null;

    if (loyaltyRow?.program_id) {
      const [
        { data: program },
        { data: allTiers },
        { data: lastTransaction },
      ] = await Promise.all([
        supabase
          .from('loyalty_programs')
          .select('id, name, points_per_purchase, minimum_purchase')
          .eq('id', loyaltyRow.program_id)
          .maybeSingle(),
        supabase
          .from('loyalty_tiers')
          .select('id, name, color, min_points, multiplier')
          .eq('program_id', loyaltyRow.program_id)
          .eq('is_active', true)
          .order('min_points', { ascending: true }),
        supabase
          .from('points_transactions')
          .select('id, type, points, description, created_at, reference_type')
          .eq('customer_loyalty_id', loyaltyRow.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const tiers = Array.isArray(allTiers) ? [...allTiers].sort((a: any, b: any) => Number(a.min_points || 0) - Number(b.min_points || 0)) : [];
      const currentTier = tiers.find((tier: any) => tier.id === loyaltyRow.current_tier_id) || null;
      const nextTier = tiers.find((tier: any) => Number(tier.min_points || 0) > Number(loyaltyRow.total_points_earned || 0)) || null;
      const currentTierMin = currentTier ? Number(currentTier.min_points || 0) : 0;
      const nextTierMin = nextTier ? Number(nextTier.min_points || 0) : null;
      const totalEarned = Number(loyaltyRow.total_points_earned || 0);
      const pointsToNextTier = nextTierMin !== null ? Math.max(0, nextTierMin - totalEarned) : null;
      const progressToNextTier = nextTierMin !== null
        ? Math.min(
            100,
            Math.max(
              0,
              ((totalEarned - currentTierMin) / Math.max(1, nextTierMin - currentTierMin)) * 100,
            ),
          )
        : 100;

      loyalty = {
        customerLoyaltyId: loyaltyRow.id,
        programId: loyaltyRow.program_id,
        programName: program?.name || 'Programa de fidelidad',
        currentPoints: Number(loyaltyRow.current_points || 0),
        totalPointsEarned: totalEarned,
        totalPointsRedeemed: Number(loyaltyRow.total_points_redeemed || 0),
        enrollmentDate: loyaltyRow.enrollment_date || null,
        lastActivityDate: loyaltyRow.last_activity_date || null,
        pointsPerPurchase: program?.points_per_purchase ?? null,
        minimumPurchase: program?.minimum_purchase ?? null,
        currentTier: currentTier
          ? {
              id: currentTier.id,
              name: currentTier.name,
              color: currentTier.color || null,
              minPoints: Number(currentTier.min_points || 0),
              multiplier: Number(currentTier.multiplier || 1),
            }
          : null,
        nextTier: nextTier
          ? {
              id: nextTier.id,
              name: nextTier.name,
              color: nextTier.color || null,
              minPoints: Number(nextTier.min_points || 0),
            }
          : null,
        pointsToNextTier,
        progressToNextTier,
        lastTransaction: lastTransaction
          ? {
              id: lastTransaction.id,
              type: lastTransaction.type,
              points: Number(lastTransaction.points || 0),
              description: lastTransaction.description || null,
              createdAt: lastTransaction.created_at,
              referenceType: lastTransaction.reference_type || null,
            }
          : null,
      };
    }

    // Transform customer data
    const transformedCustomer = transformCustomerRecord(customer, {
      purchaseHistory: purchaseHistory || [],
      appointmentHistory,
      loyalty,
      activitySummary,
    });

    return NextResponse.json({
      success: true,
      data: transformedCustomer
    });

  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER']
    });
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();
    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);

    if (!id || !orgId) {
      return NextResponse.json(
        { success: false, error: !id ? 'Customer ID is required' : 'Organization header missing' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { name, email, phone } = body;
    const normalizedName = name === undefined ? undefined : sanitizeNullableText(name);
    const normalizedEmail = email === undefined ? undefined : sanitizeNullableText(email);
    const normalizedPhone = phone === undefined ? undefined : sanitizeNullableText(phone);

    if (name !== undefined && !normalizedName) {
      return NextResponse.json(
        { success: false, error: 'Customer name cannot be empty' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check for duplicate email (excluding current customer)
    if (normalizedEmail) {
      const { data: existingEmail } = await supabase
        .from('customers')
        .select('id')
        .eq('email', normalizedEmail)
        .eq('organization_id', orgId)
        .neq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'A customer with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Check for duplicate phone (excluding current customer)
    if (normalizedPhone) {
      const { data: existingPhone } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', normalizedPhone)
        .eq('organization_id', orgId)
        .neq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingPhone) {
        return NextResponse.json(
          { success: false, error: 'A customer with this phone number already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only update provided fields
    if (body.name !== undefined) updateData.name = normalizedName;
    if (body.email !== undefined) updateData.email = normalizedEmail ?? null;
    if (body.phone !== undefined) updateData.phone = normalizedPhone ?? null;
    if (body.address !== undefined) updateData.address = sanitizeNullableText(body.address);
    if (body.tax_id !== undefined) updateData.tax_id = sanitizeNullableText(body.tax_id);
    if (body.ruc !== undefined) updateData.ruc = sanitizeNullableText(body.ruc);
    if (body.customerType !== undefined) updateData.customer_type = mapCustomerTypeToDb(body.customerType);
    if (body.birthDate !== undefined) updateData.birth_date = body.birthDate || null;
    if (body.notes !== undefined) updateData.notes = sanitizeNullableText(body.notes);
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
      updateData.status = body.is_active ? 'active' : 'inactive';
    }

    // Update customer
    const { data: customer, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update customer', details: error.message },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Transform response data
    const transformedCustomer = transformCustomerRecord(customer);

    return NextResponse.json({
      success: true,
      data: transformedCustomer,
      message: 'Customer updated successfully'
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN']
    });
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();
    const { id } = await params;
    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);

    if (!id || !orgId) {
      return NextResponse.json(
        { success: false, error: !id ? 'Customer ID is required' : 'Organization header missing' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, name, total_orders')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single();

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if customer has sales history
    const { count: salesCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null);

    if (salesCount && salesCount > 0) {
      // Soft delete: mark as inactive instead of hard delete
      const { error } = await supabase
        .from('customers')
        .update({ 
          is_active: false,
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('organization_id', orgId)
        .is('deleted_at', null);

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Customer deactivated successfully (has sales history)',
        action: 'deactivated'
      });
    } else {
      // Hard delete: customer has no sales history
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)
        .is('deleted_at', null);

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Customer deleted successfully',
        action: 'deleted'
      });
    }

  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
