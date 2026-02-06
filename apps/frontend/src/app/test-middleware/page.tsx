import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function TestMiddlewarePage() {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>🧪 Test: Middleware Execution</h1>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>📋 All Cookies:</h2>
        <pre style={{ background: 'white', padding: '1rem', overflow: 'auto' }}>
          {JSON.stringify(allCookies, null, 2)}
        </pre>
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e3f2fd', borderRadius: '8px' }}>
        <h2>🔍 Test Instructions:</h2>
        <ol>
          <li>Access: <a href="/bfjeem/test-middleware">/bfjeem/test-middleware</a></li>
          <li>The middleware should detect "bfjeem" and set cookies</li>
          <li>You should see x-organization-* cookies above</li>
        </ol>
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff3cd', borderRadius: '8px' }}>
        <h2>💡 Expected Cookies:</h2>
        <ul>
          <li><code>x-organization-id</code>: UUID of the organization</li>
          <li><code>x-organization-name</code>: Name of the organization</li>
          <li><code>x-organization-slug</code>: Slug of the organization</li>
        </ul>
      </div>
    </div>
  );
}
