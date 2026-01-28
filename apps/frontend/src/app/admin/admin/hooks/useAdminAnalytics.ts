import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Organization } from './useAdminData';

export interface RevenueData {
    date: string;
    mrr: number;
    arr: number;
    newRevenue: number;
    churnedRevenue: number;
}

export interface GrowthMetrics {
    totalOrgs: number;
    totalUsers: number;
    activeSubscriptions: number;
    trialCount: number;
    churnRate: number;
    conversionRate: number;
    averageLifetimeValue: number;
}

export interface PlanBreakdown {
    plan: string;
    count: number;
    revenue: number;
    percentage: number;
}

export function useAdminAnalytics() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                const { data: orgsData, error: orgsError } = await supabase
                    .from('organizations')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (orgsError) throw orgsError;

                setOrganizations(orgsData || []);
            } catch (err: any) {
                console.error('Error fetching analytics data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [supabase]);

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = useMemo(() => {
        return organizations.reduce((acc, org) => {
            if (org.subscription_status !== 'ACTIVE') return acc;
            if (org.subscription_plan === 'PRO') return acc + 29;
            if (org.subscription_plan === 'ENTERPRISE') return acc + 99;
            return acc;
        }, 0);
    }, [organizations]);

    // Calculate ARR (Annual Recurring Revenue)
    const arr = useMemo(() => mrr * 12, [mrr]);

    // Growth metrics
    const growthMetrics = useMemo((): GrowthMetrics => {
        const totalOrgs = organizations.length;
        const activeOrgs = organizations.filter(o => o.subscription_status === 'ACTIVE').length;
        const trialOrgs = organizations.filter(o => o.subscription_status === 'TRIAL').length;
        const cancelledOrgs = organizations.filter(o => o.subscription_status === 'CANCELLED').length;

        const churnRate = totalOrgs > 0 ? (cancelledOrgs / totalOrgs) * 100 : 0;
        const conversionRate = (trialOrgs + activeOrgs) > 0
            ? (activeOrgs / (trialOrgs + activeOrgs)) * 100
            : 0;

        return {
            totalOrgs,
            totalUsers: 0, // Would need separate query
            activeSubscriptions: activeOrgs,
            trialCount: trialOrgs,
            churnRate,
            conversionRate,
            averageLifetimeValue: activeOrgs > 0 ? mrr / activeOrgs : 0,
        };
    }, [organizations, mrr]);

    // Plan breakdown
    const planBreakdown = useMemo((): PlanBreakdown[] => {
        const breakdown: { [key: string]: PlanBreakdown } = {};

        organizations.forEach(org => {
            if (org.subscription_status !== 'ACTIVE') return;

            const plan = org.subscription_plan;
            if (!breakdown[plan]) {
                breakdown[plan] = {
                    plan,
                    count: 0,
                    revenue: 0,
                    percentage: 0,
                };
            }

            breakdown[plan].count += 1;

            if (plan === 'PRO') breakdown[plan].revenue += 29;
            if (plan === 'ENTERPRISE') breakdown[plan].revenue += 99;
        });

        // Calculate percentages
        const totalRevenue = Object.values(breakdown).reduce((acc, item) => acc + item.revenue, 0);
        Object.values(breakdown).forEach(item => {
            item.percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
        });

        return Object.values(breakdown).sort((a, b) => b.revenue - a.revenue);
    }, [organizations]);

    // Revenue trend (last 12 months)
    const revenueTrend = useMemo((): RevenueData[] => {
        const months: RevenueData[] = [];
        const now = new Date();

        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = date.toISOString().split('T')[0];

            // Calculate MRR for this month
            const orgsInMonth = organizations.filter(org => {
                const createdDate = new Date(org.created_at);
                return createdDate <= date && org.subscription_status === 'ACTIVE';
            });

            const monthMrr = orgsInMonth.reduce((acc, org) => {
                if (org.subscription_plan === 'PRO') return acc + 29;
                if (org.subscription_plan === 'ENTERPRISE') return acc + 99;
                return acc;
            }, 0);

            months.push({
                date: monthStr,
                mrr: monthMrr,
                arr: monthMrr * 12,
                newRevenue: 0, // Would need more detailed tracking
                churnedRevenue: 0, // Would need more detailed tracking
            });
        }

        return months;
    }, [organizations]);

    // Organization growth trend (last 12 months)
    const organizationGrowth = useMemo(() => {
        const months: { date: string; count: number; newOrgs: number }[] = [];
        const now = new Date();

        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = date.toISOString().split('T')[0];

            const orgsUntilMonth = organizations.filter(org => {
                const createdDate = new Date(org.created_at);
                return createdDate <= date;
            }).length;

            const newOrgsInMonth = organizations.filter(org => {
                const createdDate = new Date(org.created_at);
                return createdDate.getFullYear() === date.getFullYear() &&
                    createdDate.getMonth() === date.getMonth();
            }).length;

            months.push({
                date: monthStr,
                count: orgsUntilMonth,
                newOrgs: newOrgsInMonth,
            });
        }

        return months;
    }, [organizations]);

    return {
        loading,
        error,
        mrr,
        arr,
        growthMetrics,
        planBreakdown,
        revenueTrend,
        organizationGrowth,
    };
}
