import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock NextResponse
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server');
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((body, init) => ({ body, init, status: init?.status || 200 })),
    },
  };
});

// Mock Supabase
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

describe('Organization Info API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use x-organization-id header if present and valid', async () => {
    const orgId = 'org-123';
    const userId = 'user-123';
    
    // Mock User
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    
    // Mock database responses
    mockFrom.mockImplementation((table) => {
      if (table === 'organization_members') {
        return {
          select: () => ({
            eq: (field1, val1) => ({
              eq: (field2, val2) => ({
                single: () => {
                  // Check if we are querying for the specific org and user
                  if (val1 === userId && val2 === orgId) {
                     return Promise.resolve({ 
                        data: { organization_id: orgId, role: 'admin', permissions: ['all'] } 
                     });
                  }
                  return Promise.resolve({ data: null });
                }
              })
            })
          })
        };
      }
      if (table === 'organizations') {
        return {
            select: () => ({
              eq: (field, val) => ({
                single: () => {
                    if (val === orgId) {
                        return Promise.resolve({ 
                            data: { id: orgId, name: 'Test Org', slug: 'test-org' } 
                        });
                    }
                    return Promise.resolve({ data: null });
                }
              })
            })
          };
      }
      // Default fallback for other tables (like users)
      return { 
          select: () => ({ 
              eq: () => ({ 
                  single: () => Promise.resolve({ data: null }) 
              }) 
          }) 
      };
    });

    const request = new NextRequest('http://localhost/api/auth/organization/info', {
      headers: { 'x-organization-id': orgId }
    });

    const response = await GET(request);
    const body = (response as any).body;

    expect(body.success).toBe(true);
    expect(body.data.organizationId).toBe(orgId);
    expect(body.data.role).toBe('admin');
  });

  it('should fallback to users table organization_id if header is missing', async () => {
    const defaultOrgId = 'org-default';
    const userId = 'user-123';

    // Mock User
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });

    // Mock database responses
    mockFrom.mockImplementation((table) => {
        if (table === 'users') {
            return {
                select: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({ 
                            data: { organization_id: defaultOrgId, role: 'member' } 
                        })
                    })
                })
            };
        }
        if (table === 'organizations') {
            return {
                select: () => ({
                    eq: (field, val) => ({
                        single: () => {
                            if (val === defaultOrgId) {
                                return Promise.resolve({ 
                                    data: { id: defaultOrgId, name: 'Default Org', slug: 'default-org' } 
                                });
                            }
                            return Promise.resolve({ data: null });
                        }
                    })
                })
            };
        }
        // organization_members fallback
        return { 
            select: () => ({ 
                eq: () => ({ 
                    eq: () => ({
                        single: () => Promise.resolve({ data: null }) 
                    }),
                    single: () => Promise.resolve({ data: null })
                }) 
            }) 
        };
    });

    const request = new NextRequest('http://localhost/api/auth/organization/info');

    const response = await GET(request);
    const body = (response as any).body;

    expect(body.success).toBe(true);
    expect(body.data.organizationId).toBe(defaultOrgId);
    expect(body.data.name).toBe('Default Org');
  });

  it('should fallback to first organization membership if header and user default are missing', async () => {
    const userId = 'user-123';
    const firstOrgId = 'org-first';

    // Mock User
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });

    // Mock database responses
    mockFrom.mockImplementation((table) => {
        if (table === 'users') {
            return {
                select: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({ 
                            data: { organization_id: null, role: null } // No default org
                        })
                    })
                })
            };
        }
        if (table === 'organization_members') {
             // For the specific query in step 3 (last resort)
             // .select(...).eq(...).limit(1).maybeSingle()
             return {
                select: () => ({
                    eq: () => ({
                        limit: () => ({
                            maybeSingle: () => Promise.resolve({
                                data: { organization_id: firstOrgId, role: 'viewer', permissions: ['view'] }
                            })
                        }),
                         // For step 1 and 2 checks which might be called but return null
                        eq: () => ({
                            single: () => Promise.resolve({ data: null })
                        }),
                        single: () => Promise.resolve({ data: null })
                    })
                })
             };
        }
        if (table === 'organizations') {
            return {
                select: () => ({
                    eq: (field, val) => ({
                        single: () => {
                            if (val === firstOrgId) {
                                return Promise.resolve({ 
                                    data: { id: firstOrgId, name: 'First Org', slug: 'first-org' } 
                                });
                            }
                            return Promise.resolve({ data: null });
                        }
                    })
                })
            };
        }
        return { 
            select: () => ({ 
                eq: () => ({ 
                    single: () => Promise.resolve({ data: null }) 
                }) 
            }) 
        };
    });

    const request = new NextRequest('http://localhost/api/auth/organization/info');

    const response = await GET(request);
    const body = (response as any).body;

    expect(body.success).toBe(true);
    expect(body.data.organizationId).toBe(firstOrgId);
    expect(body.data.name).toBe('First Org');
  });
  
  it('should return error if no organization found in header or users table', async () => {
    const userId = 'user-123';

    // Mock User
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });

    // Mock database responses returning null
    mockFrom.mockReturnValue({
        select: () => ({
            eq: () => ({
                eq: () => ({ single: () => Promise.resolve({ data: null }) }), // for double eq
                single: () => Promise.resolve({ data: null }), // for single eq
                limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: null })
                })
            })
        })
    });

    const request = new NextRequest('http://localhost/api/auth/organization/info');

    const response = await GET(request);
    const body = (response as any).body;

    expect(body.success).toBe(true);
    expect(body.data).toBeNull();
    expect(body.message).toBe('Usuario sin organización asignada');
  });
});
