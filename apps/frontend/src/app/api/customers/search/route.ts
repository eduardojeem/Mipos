import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRole } from "@/app/api/_utils/role-validation";
import {
  resolveCustomerOrganizationId,
  transformCustomerRecord,
} from "@/app/api/customers/_lib";

/**
 * Customer Search API - Phase 5 Optimization
 *
 * Provides intelligent customer search with suggestions, fuzzy matching, and relevance scoring.
 * Optimized for real-time search with minimal latency.
 */

export async function GET(request: NextRequest) {
  try {
    const auth = await validateRole(request, {
      roles: [
        "OWNER",
        "ADMIN",
        "SUPER_ADMIN",
        "MANAGER",
        "EMPLOYEE",
        "CASHIER",
      ],
    });
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "Organization header missing" },
        { status: 400 },
      );
    }

    const query = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const includeSuggestions = searchParams.get("suggestions") === "true";
    const includeStats = searchParams.get("stats") === "true";
    const candidateLimit = Math.min(
      includeSuggestions || includeStats ? limit * 5 : limit * 2,
      100,
    );

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          suggestions: [],
          stats: { totalResults: 0, searchTime: 0 },
        },
      });
    }

    const startTime = performance.now();
    const searchTerm = query.trim();

    const { data: customers, error } = await supabase
      .from("customers")
      .select(
        `
        id,
        name,
        email,
        phone,
        address,
        tax_id,
        ruc,
        customer_code,
        customer_type,
        is_active,
        total_purchases,
        total_orders,
        last_purchase,
        birth_date,
        notes,
        created_at,
        updated_at
      `,
      )
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .or(
        `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`,
      )
      .limit(candidateLimit);

    if (error) {
      throw new Error(error.message);
    }

    const scoredResults = (customers || [])
      .map((customer: any) => {
        const score = calculateRelevanceScore(customer, searchTerm);
        const transformedCustomer = transformCustomerRecord(customer);

        return {
          customer: {
            ...transformedCustomer,
            valueLevel: getValueLevel(transformedCustomer.totalSpent || 0),
          },
          score,
          matchedFields: getMatchedFields(customer, searchTerm),
        };
      })
      .filter((item: any) => item.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit);

    const results = scoredResults.map((item: any) => ({
      ...item.customer,
      _relevanceScore: item.score,
      _matchedFields: item.matchedFields,
    }));

    const searchTime = Math.round(performance.now() - startTime);

    let suggestions: string[] = [];
    if (includeSuggestions && results.length < limit) {
      suggestions = generateSearchSuggestionsFromCustomers(
        customers || [],
        searchTerm,
        5,
      );
    }

    let stats = { totalResults: results.length, searchTime };
    if (includeStats) {
      const { count: totalMatches, error: totalMatchesError } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .or(
          `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`,
        );

      if (totalMatchesError) {
        console.warn(
          "Error counting customer search matches:",
          totalMatchesError.message,
        );
      }

      stats = {
        ...stats,
        ...generateSearchStatsFromCustomers(
          customers || [],
          searchTerm,
          results.length,
          totalMatchesError
            ? results.length
            : (totalMatches ?? (customers?.length || 0)),
        ),
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        suggestions,
        stats,
        query: searchTerm,
      },
    });
  } catch (error) {
    console.error("Error in customer search:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to search customers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function calculateRelevanceScore(customer: any, searchTerm: string): number {
  let score = 0;
  const term = searchTerm.toLowerCase();

  if (customer.name?.toLowerCase() === term) score += 100;
  if (customer.email?.toLowerCase() === term) score += 90;
  if (customer.customer_code?.toLowerCase() === term) score += 95;
  if (customer.phone?.toLowerCase() === term) score += 85;

  if (customer.name?.toLowerCase().startsWith(term)) score += 50;
  if (customer.email?.toLowerCase().startsWith(term)) score += 45;
  if (customer.customer_code?.toLowerCase().startsWith(term)) score += 48;

  if (customer.name?.toLowerCase().includes(term)) score += 30;
  if (customer.email?.toLowerCase().includes(term)) score += 25;
  if (customer.customer_code?.toLowerCase().includes(term)) score += 28;
  if (customer.phone?.toLowerCase().includes(term)) score += 20;

  if (customer.is_active) score += 5;

  if (customer.total_purchases > 10000) score += 10;
  else if (customer.total_purchases > 5000) score += 5;

  if (customer.total_orders > 20) score += 8;
  else if (customer.total_orders > 10) score += 4;

  if (customer.last_purchase) {
    const daysSinceLastPurchase = Math.floor(
      (Date.now() - new Date(customer.last_purchase).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysSinceLastPurchase < 30) score += 3;
  }

  return score;
}

function getMatchedFields(customer: any, searchTerm: string): string[] {
  const matchedFields: string[] = [];
  const term = searchTerm.toLowerCase();

  if (customer.name?.toLowerCase().includes(term)) matchedFields.push("name");
  if (customer.email?.toLowerCase().includes(term)) matchedFields.push("email");
  if (customer.customer_code?.toLowerCase().includes(term))
    matchedFields.push("customer_code");
  if (customer.phone?.toLowerCase().includes(term)) matchedFields.push("phone");

  return matchedFields;
}

function generateSearchSuggestionsFromCustomers(
  customers: any[],
  searchTerm: string,
  limit: number,
): string[] {
  const suggestions: Set<string> = new Set();
  const term = searchTerm.toLowerCase();

  for (const customer of customers) {
    for (const value of [
      customer.name,
      customer.email,
      customer.customer_code,
      customer.phone,
    ]) {
      if (typeof value !== "string") continue;

      const normalized = value.toLowerCase();
      if (normalized === term || !normalized.includes(term)) continue;

      if (normalized.startsWith(term) || suggestions.size < limit) {
        suggestions.add(value);
      }

      if (suggestions.size >= limit) {
        return Array.from(suggestions).slice(0, limit);
      }
    }
  }

  return Array.from(suggestions).slice(0, limit);
}

function generateSearchStatsFromCustomers(
  customers: any[],
  searchTerm: string,
  resultCount: number,
  totalMatches: number,
) {
  const distribution = { name: 0, email: 0, customerCode: 0, phone: 0 };

  for (const customer of customers) {
    const matchedFields = getMatchedFields(customer, searchTerm);
    if (matchedFields.includes("name")) distribution.name += 1;
    if (matchedFields.includes("email")) distribution.email += 1;
    if (matchedFields.includes("customer_code")) distribution.customerCode += 1;
    if (matchedFields.includes("phone")) distribution.phone += 1;
  }

  return {
    totalMatches,
    returnedResults: resultCount,
    matchDistribution: distribution,
  };
}

function getValueLevel(
  totalSpent: number,
): "low" | "medium" | "high" | "premium" {
  if (totalSpent > 50000) return "premium";
  if (totalSpent > 10000) return "high";
  if (totalSpent > 2000) return "medium";
  return "low";
}
