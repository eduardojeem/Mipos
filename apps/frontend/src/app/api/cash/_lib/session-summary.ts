import { parseStoredSalePaymentDetails } from '@/lib/sales-payment-details';

type SupabaseLike = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

type OperationalContextLike = {
  branchId?: string | null;
  posId?: string | null;
};

type CashSessionRow = {
  id: string;
  organization_id?: string | null;
  opened_by?: string | null;
  closed_by?: string | null;
  opening_amount?: number | string | null;
  closing_amount?: number | string | null;
  system_expected?: number | string | null;
  discrepancy_amount?: number | string | null;
  status?: string | null;
  notes?: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
  branch_id?: string | null;
  pos_id?: string | null;
  opened_by_user?: {
    id: string;
    email?: string | null;
    full_name?: string | null;
  } | null;
  closed_by_user?: {
    id: string;
    email?: string | null;
    full_name?: string | null;
  } | null;
};

type CashCountRow = {
  session_id: string;
  denomination?: number | string | null;
  quantity?: number | string | null;
  total?: number | string | null;
};

type CashMovementRow = {
  id: string;
  session_id: string;
  type?: string | null;
  amount?: number | string | null;
  reason?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at?: string | null;
  created_by?: string | null;
};

type SaleRow = {
  id: string;
  total_amount?: number | string | null;
  payment_method?: string | null;
  payment_details?: unknown;
  status?: string | null;
  created_at?: string | null;
  branch_id?: string | null;
  pos_id?: string | null;
};

type ReturnRow = {
  id: string;
  total_amount?: number | string | null;
  refund_method?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type PaymentMethodKey = 'CASH' | 'CARD' | 'TRANSFER' | 'QR' | 'OTHER' | 'UNKNOWN';

const SESSION_SELECT = `
  *,
  opened_by_user:opened_by(id, email, full_name),
  closed_by_user:closed_by(id, email, full_name)
`;

const MOVEMENT_SELECT = `
  id,
  session_id,
  type,
  amount,
  reason,
  reference_type,
  reference_id,
  created_at,
  created_by
`;

const PAYMENT_METHOD_ORDER: PaymentMethodKey[] = ['CASH', 'CARD', 'TRANSFER', 'QR', 'OTHER', 'UNKNOWN'];

const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  QR: 'QR',
  OTHER: 'Otro',
  UNKNOWN: 'Sin definir',
};

function isMissingColumnError(error: unknown): boolean {
  const message = String((error as { message?: unknown } | null)?.message ?? '').toLowerCase();
  const details = String((error as { details?: unknown } | null)?.details ?? '').toLowerCase();
  const code = String((error as { code?: unknown } | null)?.code ?? '').toUpperCase();

  return (
    code === 'PGRST204' ||
    code === '42703' ||
    (message.includes('column') && message.includes('does not exist')) ||
    (details.includes('column') && details.includes('does not exist'))
  );
}

function normalizeScopeValue(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePaymentMethod(value: string | null | undefined): PaymentMethodKey {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return 'UNKNOWN';
  if (raw === 'CASH' || raw === 'EFECTIVO') return 'CASH';
  if (raw === 'CARD' || raw === 'TARJETA') return 'CARD';
  if (raw === 'TRANSFER' || raw === 'TRANSFERENCIA' || raw === 'BANK_TRANSFER') return 'TRANSFER';
  if (raw === 'QR') return 'QR';
  if (raw === 'OTHER' || raw === 'OTRO') return 'OTHER';
  return 'UNKNOWN';
}

function parseDate(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

function isWithinSessionWindow(
  createdAt: string | null | undefined,
  openedAt: string | null | undefined,
  closedAt: string | null | undefined,
): boolean {
  const createdTime = parseDate(createdAt);
  const openedTime = parseDate(openedAt);
  const closedTime = closedAt ? parseDate(closedAt) : Number.POSITIVE_INFINITY;

  if (!Number.isFinite(createdTime) || !Number.isFinite(openedTime)) {
    return false;
  }

  return createdTime >= openedTime && createdTime <= closedTime;
}

function buildPaymentMethodSummary(
  rows: Array<{ amount?: number | string | null; method?: string | null }>,
) {
  const totals = new Map<PaymentMethodKey, { method: PaymentMethodKey; label: string; amount: number; count: number; affectsCash: boolean }>();

  for (const row of rows) {
    const method = normalizePaymentMethod(row.method);
    const current = totals.get(method) ?? {
      method,
      label: PAYMENT_METHOD_LABELS[method],
      amount: 0,
      count: 0,
      affectsCash: method === 'CASH',
    };

    current.amount += toNumber(row.amount);
    current.count += 1;
    totals.set(method, current);
  }

  return PAYMENT_METHOD_ORDER
    .map((method) => totals.get(method))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.amount > 0 || item.count > 0);
}

function groupBySessionId<T extends { session_id: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const list = grouped.get(row.session_id) ?? [];
    list.push(row);
    grouped.set(row.session_id, list);
  }

  return grouped;
}

function buildSessionSummary(
  session: CashSessionRow,
  movements: CashMovementRow[],
  counts: CashCountRow[],
  sales: SaleRow[],
  returns: ReturnRow[],
) {
  const totals = {
    manualIn: 0,
    manualOut: 0,
    cashSales: 0,
    refunds: 0,
    adjustments: 0,
    movementCount: movements.length,
    movementTypeCounts: {
      IN: 0,
      OUT: 0,
      SALE: 0,
      RETURN: 0,
      ADJUSTMENT: 0,
    },
    lastMovementAt: movements[0]?.created_at ?? null,
  };

  for (const movement of movements) {
    const type = String(movement.type || '').toUpperCase();
    const amount = toNumber(movement.amount);

    if (type in totals.movementTypeCounts) {
      const movementKey = type as keyof typeof totals.movementTypeCounts;
      totals.movementTypeCounts[movementKey] += 1;
    }

    if (type === 'IN') {
      totals.manualIn += Math.abs(amount);
    } else if (type === 'OUT') {
      totals.manualOut += Math.abs(amount);
    } else if (type === 'SALE') {
      totals.cashSales += Math.abs(amount);
    } else if (type === 'RETURN') {
      totals.refunds += Math.abs(amount);
    } else if (type === 'ADJUSTMENT') {
      totals.adjustments += amount;
    }
  }

  const openingAmount = toNumber(session.opening_amount);
  const expectedCash =
    openingAmount +
    totals.manualIn +
    totals.cashSales -
    totals.manualOut -
    totals.refunds +
    totals.adjustments;

  const countedCashFromCounts = counts.reduce((sum, count) => sum + toNumber(count.total), 0);
  const actualCash =
    session.closing_amount != null
      ? toNumber(session.closing_amount)
      : counts.length > 0
        ? countedCashFromCounts
        : null;

  const differenceAmount =
    actualCash != null
      ? actualCash - expectedCash
      : session.discrepancy_amount != null
        ? toNumber(session.discrepancy_amount)
        : null;

  const completedSales = sales.filter((sale) => {
    const status = String(sale.status || '').toUpperCase();
    return status !== 'CANCELLED' && status !== 'PENDING';
  });

  const salePaymentDetails = completedSales.map((sale) =>
    parseStoredSalePaymentDetails(sale.payment_details, sale),
  );

  const completedReturns = returns.filter((item) => String(item.status || '').toUpperCase() === 'COMPLETED');

  const totalSold = completedSales.reduce((sum, sale) => sum + toNumber(sale.total_amount), 0);
  const totalRefunded = completedReturns.reduce((sum, item) => sum + toNumber(item.total_amount), 0);

  return {
    movementCount: totals.movementCount,
    movementTypeCounts: totals.movementTypeCounts,
    lastMovementAt: totals.lastMovementAt,
    totalSold,
    totalRefunded,
    salesCount: completedSales.length,
    returnsCount: completedReturns.length,
    manualIn: totals.manualIn,
    manualOut: totals.manualOut,
    cashSales: totals.cashSales,
    refunds: totals.refunds,
    adjustments: totals.adjustments,
    netCashFlow: expectedCash - openingAmount,
    expectedCash,
    actualCash,
    differenceAmount,
    paymentMethods: buildPaymentMethodSummary(
      salePaymentDetails.flatMap((details) =>
        details.payments.map((payment) => ({
          amount: payment.amount,
          method: payment.method,
        })),
      ),
    ),
    refundMethods: buildPaymentMethodSummary(
      completedReturns.map((item) => ({
        amount: item.total_amount,
        method: item.refund_method,
      })),
    ),
  };
}

function matchesOperationalContext(
  row: { branch_id?: string | null; pos_id?: string | null },
  session: CashSessionRow,
) {
  if (session.branch_id && row.branch_id && row.branch_id !== session.branch_id) {
    return false;
  }

  if (session.pos_id && row.pos_id && row.pos_id !== session.pos_id) {
    return false;
  }

  return true;
}

function getSessionMatchPriority(
  row: { branch_id?: string | null; pos_id?: string | null },
  context?: OperationalContextLike,
) {
  const requestBranchId = normalizeScopeValue(context?.branchId);
  const requestPosId = normalizeScopeValue(context?.posId);
  const sessionBranchId = normalizeScopeValue(row.branch_id);
  const sessionPosId = normalizeScopeValue(row.pos_id);

  if (!requestBranchId && !requestPosId) {
    // If request is global, prefer global sessions (3) but allow branch sessions with low priority (1)
    return !sessionBranchId && !sessionPosId ? 3 : 1;
  }

  if (requestBranchId) {
    if (sessionBranchId === requestBranchId && requestPosId && sessionPosId === requestPosId) {
      return 4;
    }

    if (sessionBranchId === requestBranchId) {
      return 3;
    }

    if (!sessionBranchId && !sessionPosId) {
      return 1;
    }

    return 0;
  }

  if (requestPosId) {
    if (sessionPosId === requestPosId) {
      return 3;
    }

    if (!sessionBranchId && !sessionPosId) {
      return 1;
    }

    return 0;
  }

  return 0;
}

function isConflictingOpenSession(
  row: { branch_id?: string | null; pos_id?: string | null },
  context?: OperationalContextLike,
) {
  const requestBranchId = normalizeScopeValue(context?.branchId);
  const requestPosId = normalizeScopeValue(context?.posId);
  const sessionBranchId = normalizeScopeValue(row.branch_id);
  const sessionPosId = normalizeScopeValue(row.pos_id);

  if (!requestBranchId && !requestPosId) {
    return !sessionBranchId && !sessionPosId;
  }

  if (requestBranchId) {
    return sessionBranchId === requestBranchId;
  }

  if (requestPosId) {
    return sessionPosId === requestPosId;
  }

  return false;
}

async function fetchOpenCashSessionRows(client: SupabaseLike, organizationId: string) {
  const scoped = await client
    .from('cash_sessions')
    .select(SESSION_SELECT)
    .eq('organization_id', organizationId)
    .or('status.eq.OPEN,status.eq.open')
    .order('opened_at', { ascending: false })
    .limit(50);

  if (!scoped.error) {
    return (scoped.data || []) as CashSessionRow[];
  }

  if (!isMissingColumnError(scoped.error)) {
    throw new Error(scoped.error.message || 'Failed to fetch open cash session');
  }

  const fallback = await client
    .from('cash_sessions')
    .select(SESSION_SELECT)
    .eq('organization_id', organizationId)
    .or('status.eq.OPEN,status.eq.open')
    .order('created_at', { ascending: false })
    .limit(50);

  if (fallback.error) {
    throw new Error(fallback.error.message || 'Failed to fetch open cash session');
  }

  return (fallback.data || []) as CashSessionRow[];
}

export async function fetchOpenCashSession(
  client: SupabaseLike,
  organizationId: string,
  context?: { branchId?: string | null; posId?: string | null },
) {
  const rows = await fetchOpenCashSessionRows(client, organizationId);
  const ranked = rows
    .map((row) => ({ row, priority: getSessionMatchPriority(row, context) }))
    .filter((entry) => entry.priority > 0)
    .sort((left, right) => right.priority - left.priority);

  return ranked[0]?.row ?? null;
}

export async function findOpenCashSessionConflict(
  client: SupabaseLike,
  organizationId: string,
  context?: OperationalContextLike,
) {
  const rows = await fetchOpenCashSessionRows(client, organizationId);
  return rows.find((row) => isConflictingOpenSession(row, context)) ?? null;
}

export async function fetchCashSessionById(client: SupabaseLike, organizationId: string, sessionId: string) {
  const { data, error } = await client
    .from('cash_sessions')
    .select(SESSION_SELECT)
    .eq('id', sessionId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to fetch cash session');
  }

  return (data as CashSessionRow | null) ?? null;
}

export async function enrichCashSessions(
  client: SupabaseLike,
  organizationId: string,
  sessions: CashSessionRow[],
  options?: {
    recentMovementsLimit?: number;
  },
) {
  if (sessions.length === 0) {
    return [];
  }

  const recentMovementsLimit = options?.recentMovementsLimit ?? 8;
  const sessionIds = sessions.map((session) => session.id);

  const [countsResult, movementsResult] = await Promise.all([
    client
      .from('cash_counts')
      .select('session_id, denomination, quantity, total')
      .eq('organization_id', organizationId)
      .in('session_id', sessionIds),
    client
      .from('cash_movements')
      .select(MOVEMENT_SELECT)
      .eq('organization_id', organizationId)
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false }),
  ]);

  if (countsResult.error) {
    throw new Error(countsResult.error.message || 'Failed to fetch cash counts');
  }

  if (movementsResult.error) {
    throw new Error(movementsResult.error.message || 'Failed to fetch cash movements');
  }

  const counts = (countsResult.data || []) as CashCountRow[];
  const movements = (movementsResult.data || []) as CashMovementRow[];

  // Enrich movements with user data
  const uniqueUserIds = [...new Set(movements.map((m) => m.created_by).filter(Boolean))] as string[];
  const userProfilesMap = new Map<string, { id: string; fullName: string | null; email: string | null }>();

  if (uniqueUserIds.length > 0) {
    const { data: profilesData } = await client
      .from('profiles')
      .select('id, full_name, email')
      .in('id', uniqueUserIds);

    let profiles = (profilesData || []) as Array<{ id: string; full_name?: string | null; email?: string | null }>;

    if (profiles.length === 0) {
      const { data: usersData } = await client
        .from('users')
        .select('id, full_name, email')
        .in('id', uniqueUserIds);
      profiles = (usersData || []) as Array<{ id: string; full_name?: string | null; email?: string | null }>;
    }

    for (const p of profiles) {
      userProfilesMap.set(p.id, { id: p.id, fullName: p.full_name || null, email: p.email || null });
    }
  }
  const countsBySession = groupBySessionId(counts);
  const movementsBySession = groupBySessionId(movements);

  const validOpenedAt = sessions.map((session) => session.opened_at).filter(Boolean) as string[];
  const sessionClosedOrNow = sessions.map((session) => session.closed_at || new Date().toISOString());

  let sales: SaleRow[] = [];
  let returns: ReturnRow[] = [];

  if (validOpenedAt.length > 0) {
    const rangeStart = validOpenedAt.reduce((earliest, current) =>
      parseDate(current) < parseDate(earliest) ? current : earliest,
    );
    const rangeEnd = sessionClosedOrNow.reduce((latest, current) =>
      parseDate(current) > parseDate(latest) ? current : latest,
    );

    const [salesResult, returnsResult] = await Promise.all([
      client
        .from('sales')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', rangeStart)
        .lte('created_at', rangeEnd),
      client
        .from('returns')
        .select('id, total_amount, refund_method, status, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', rangeStart)
        .lte('created_at', rangeEnd),
    ]);

    if (!salesResult.error) {
      sales = (salesResult.data || []) as SaleRow[];
    }

    if (!returnsResult.error) {
      returns = (returnsResult.data || []) as ReturnRow[];
    }
  }

  return sessions.map((session) => {
    const sessionCounts = countsBySession.get(session.id) ?? [];
    const sessionMovements = movementsBySession.get(session.id) ?? [];
    const sessionSales = sales.filter((sale) =>
      isWithinSessionWindow(sale.created_at, session.opened_at, session.closed_at) &&
      matchesOperationalContext(sale, session),
    );
    const sessionReturns = returns.filter((item) =>
      isWithinSessionWindow(item.created_at, session.opened_at, session.closed_at),
    );

    const summary = buildSessionSummary(session, sessionMovements, sessionCounts, sessionSales, sessionReturns);
    const systemExpected =
      session.system_expected != null ? toNumber(session.system_expected) : summary.expectedCash;
    const discrepancyAmount =
      session.discrepancy_amount != null ? toNumber(session.discrepancy_amount) : summary.differenceAmount;

    return {
      id: session.id,
      status: String(session.status || 'UNKNOWN').toUpperCase(),
      openingAmount: toNumber(session.opening_amount),
      closingAmount: session.closing_amount != null ? toNumber(session.closing_amount) : null,
      systemExpected,
      discrepancyAmount,
      openedAt: session.opened_at ?? null,
      closedAt: session.closed_at ?? null,
      notes: session.notes ?? null,
      branchId: session.branch_id ?? null,
      posId: session.pos_id ?? null,
      openedByUser: session.opened_by_user
        ? {
            id: session.opened_by_user.id,
            email: session.opened_by_user.email || null,
            fullName: session.opened_by_user.full_name || null,
          }
        : null,
      closedByUser: session.closed_by_user
        ? {
            id: session.closed_by_user.id,
            email: session.closed_by_user.email || null,
            fullName: session.closed_by_user.full_name || null,
          }
        : null,
      counts: sessionCounts.map((count) => ({
        denomination: toNumber(count.denomination),
        quantity: toNumber(count.quantity),
        total: toNumber(count.total),
      })),
      movements: sessionMovements.slice(0, recentMovementsLimit).map((movement) => ({
        id: movement.id,
        type: String(movement.type || '').toUpperCase(),
        amount: toNumber(movement.amount),
        reason: movement.reason ?? null,
        createdByUser: movement.created_by ? (userProfilesMap.get(movement.created_by) ?? null) : null,
      })),
      summary,
    };
  });
}
