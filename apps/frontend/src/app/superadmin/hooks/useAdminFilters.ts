import { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface OrganizationFilters {
    search: string;
    plan: string[];
    status: string[];
    dateFrom: string;
    dateTo: string;
    revenueMin: number | null;
    revenueMax: number | null;
    memberCountMin: number | null;
    memberCountMax: number | null;
}

export interface UserFilters {
    search: string;
    organization: string[];
    role: string[];
    status: string[];
    dateFrom: string;
    dateTo: string;
}

const defaultOrgFilters: OrganizationFilters = {
    search: '',
    plan: [],
    status: [],
    dateFrom: '',
    dateTo: '',
    revenueMin: null,
    revenueMax: null,
    memberCountMin: null,
    memberCountMax: null,
};

const defaultUserFilters: UserFilters = {
    search: '',
    organization: [],
    role: [],
    status: [],
    dateFrom: '',
    dateTo: '',
};

export function useAdminFilters(type: 'organizations' | 'users' = 'organizations') {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize filters from URL params
    const initializeFilters = useCallback(() => {
        if (type === 'organizations') {
            const filters: OrganizationFilters = { ...defaultOrgFilters };

            const search = searchParams.get('search');
            if (search) filters.search = search;

            const plan = searchParams.get('plan');
            if (plan) filters.plan = plan.split(',');

            const status = searchParams.get('status');
            if (status) filters.status = status.split(',');

            const dateFrom = searchParams.get('dateFrom');
            if (dateFrom) filters.dateFrom = dateFrom;

            const dateTo = searchParams.get('dateTo');
            if (dateTo) filters.dateTo = dateTo;

            const revenueMin = searchParams.get('revenueMin');
            if (revenueMin) filters.revenueMin = parseFloat(revenueMin);

            const revenueMax = searchParams.get('revenueMax');
            if (revenueMax) filters.revenueMax = parseFloat(revenueMax);

            const memberCountMin = searchParams.get('memberCountMin');
            if (memberCountMin) filters.memberCountMin = parseInt(memberCountMin);

            const memberCountMax = searchParams.get('memberCountMax');
            if (memberCountMax) filters.memberCountMax = parseInt(memberCountMax);

            return filters;
        } else {
            const filters: UserFilters = { ...defaultUserFilters };

            const search = searchParams.get('search');
            if (search) filters.search = search;

            const organization = searchParams.get('organization');
            if (organization) filters.organization = organization.split(',');

            const role = searchParams.get('role');
            if (role) filters.role = role.split(',');

            const status = searchParams.get('status');
            if (status) filters.status = status.split(',');

            const dateFrom = searchParams.get('dateFrom');
            if (dateFrom) filters.dateFrom = dateFrom;

            const dateTo = searchParams.get('dateTo');
            if (dateTo) filters.dateTo = dateTo;

            return filters;
        }
    }, [searchParams, type]);

    const [filters, setFilters] = useState<OrganizationFilters | UserFilters>(
        initializeFilters()
    );

    // Update URL when filters change
    const updateURL = useCallback((newFilters: OrganizationFilters | UserFilters) => {
        const params = new URLSearchParams();

        Object.entries(newFilters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '' &&
                !(Array.isArray(value) && value.length === 0)) {
                if (Array.isArray(value)) {
                    params.set(key, value.join(','));
                } else {
                    params.set(key, value.toString());
                }
            }
        });

        const queryString = params.toString();
        router.push(queryString ? `?${queryString}` : window.location.pathname, { scroll: false });
    }, [router]);

    // Update filters
    const updateFilters = useCallback((updates: Partial<OrganizationFilters | UserFilters>) => {
        const newFilters = { ...filters, ...updates };
        setFilters(newFilters);
        updateURL(newFilters);
    }, [filters, updateURL]);

    // Clear all filters
    const clearFilters = useCallback(() => {
        const defaults = type === 'organizations' ? defaultOrgFilters : defaultUserFilters;
        setFilters(defaults);
        updateURL(defaults);
    }, [type, updateURL]);

    // Check if any filters are active
    const hasActiveFilters = useMemo(() => {
        const defaults = type === 'organizations' ? defaultOrgFilters : defaultUserFilters;
        return JSON.stringify(filters) !== JSON.stringify(defaults);
    }, [filters, type]);

    // Preset filters
    const applyPreset = useCallback((preset: string) => {
        if (type === 'organizations') {
            const orgFilters = filters as OrganizationFilters;
            switch (preset) {
                case 'high_value':
                    updateFilters({
                        ...defaultOrgFilters,
                        status: ['ACTIVE'],
                        plan: ['PRO', 'ENTERPRISE'],
                    });
                    break;
                case 'at_risk':
                    updateFilters({
                        ...defaultOrgFilters,
                        status: ['TRIAL', 'SUSPENDED'],
                    });
                    break;
                case 'trial_ending':
                    updateFilters({
                        ...defaultOrgFilters,
                        status: ['TRIAL'],
                    });
                    break;
                case 'recent':
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    updateFilters({
                        ...defaultOrgFilters,
                        dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
                    });
                    break;
                default:
                    clearFilters();
            }
        }
    }, [type, filters, updateFilters, clearFilters]);

    return {
        filters,
        updateFilters,
        clearFilters,
        hasActiveFilters,
        applyPreset,
    };
}
