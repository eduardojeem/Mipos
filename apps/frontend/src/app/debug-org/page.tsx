import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DebugOrgPage() {
  const cookieStore = cookies();
  
  // Obtener cookies
  const orgId = cookieStore.get('x-organization-id')?.value;
  const orgName = cookieStore.get('x-organization-name')?.value;
  const orgSlug = cookieStore.get('x-organization-slug')?.value;
  
  // Obtener todas las cookies
  const allCookies = cookieStore.getAll();
  
  // Intentar obtener organizaciones de la DB
  let organizations = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('organizations')
      .select('id, name, slug, subdomain, subscription_status')
      .eq('subscription_status', 'ACTIVE')
      .limit(10);
    organizations = data || [];
  } catch (error: any) {
    console.error('Error fetching organizations:', error);
  }
  
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>🔍 Debug: Organization Context</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📋 Organization Cookies</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>x-organization-id:</td>
              <td style={{ padding: '0.5rem', color: orgId ? 'green' : 'red' }}>
                {orgId || '❌ Not set'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>x-organization-name:</td>
              <td style={{ padding: '0.5rem', color: orgName ? 'green' : 'red' }}>
                {orgName || '❌ Not set'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>x-organization-slug:</td>
              <td style={{ padding: '0.5rem', color: orgSlug ? 'green' : 'red' }}>
                {orgSlug || '❌ Not set'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🍪 All Cookies</h2>
        <pre style={{ overflow: 'auto', background: 'white', padding: '1rem', borderRadius: '4px' }}>
          {JSON.stringify(allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) + '...' })), null, 2)}
        </pre>
      </div>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🏢 Available Organizations</h2>
        {organizations.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <thead>
              <tr style={{ background: '#333', color: 'white' }}>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Slug</th>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Subdomain</th>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Test URL</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org: any) => (
                <tr key={org.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '0.5rem' }}>{org.name}</td>
                  <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{org.slug}</td>
                  <td style={{ padding: '0.5rem' }}>{org.subdomain}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      background: org.subscription_status === 'ACTIVE' ? '#4caf50' : '#ff9800',
                      color: 'white',
                      fontSize: '0.8rem'
                    }}>
                      {org.subscription_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <a 
                      href={`/${org.slug}/home`}
                      style={{ color: '#2196f3', textDecoration: 'underline' }}
                    >
                      /{org.slug}/home
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'red' }}>❌ No organizations found in database</p>
        )}
      </div>
      
      <div style={{ padding: '1rem', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
        <h3 style={{ marginTop: 0 }}>💡 How to test:</h3>
        <ol>
          <li>Click on one of the "Test URL" links above</li>
          <li>The middleware should detect the organization from the path</li>
          <li>Come back to this page to see if cookies were set</li>
        </ol>
        <p style={{ marginBottom: 0 }}>
          <strong>Expected behavior:</strong> When you visit <code>/{'{slug}'}/home</code>, 
          the middleware should set the organization cookies and you should see them above.
        </p>
      </div>
    </div>
  );
}
