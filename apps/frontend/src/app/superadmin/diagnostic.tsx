'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function SuperAdminDiagnostic() {
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const runDiagnostic = async () => {
    setLoading(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      checks: {},
    };

    try {
      // 1. Check auth
      const authRes = await fetch('/api/auth/profile');
      results.checks.auth = {
        status: authRes.status,
        ok: authRes.ok,
        data: authRes.ok ? await authRes.json() : null,
      };

      // 2. Check super admin verification
      const saRes = await fetch('/api/superadmin/me');
      results.checks.superadmin = {
        status: saRes.status,
        ok: saRes.ok,
        data: saRes.ok ? await saRes.json() : null,
      };

      // 3. Check stats endpoint
      const statsRes = await fetch('/api/superadmin/stats');
      results.checks.stats = {
        status: statsRes.status,
        ok: statsRes.ok,
        data: statsRes.ok ? await statsRes.json() : await statsRes.text(),
      };

      // 4. Check organizations endpoint
      const orgsRes = await fetch('/api/superadmin/organizations?pageSize=5');
      results.checks.organizations = {
        status: orgsRes.status,
        ok: orgsRes.ok,
        data: orgsRes.ok ? await orgsRes.json() : await orgsRes.text(),
      };

    } catch (error) {
      results.error = error instanceof Error ? error.message : String(error);
    }

    setDiagnosticData(results);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Diagnóstico SuperAdmin</h1>
        <Button onClick={runDiagnostic} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {loading && <div>Ejecutando diagnóstico...</div>}

      {diagnosticData && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resultados del Diagnóstico</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-[600px] text-xs">
                {JSON.stringify(diagnosticData, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Resumen visual */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(diagnosticData.checks || {}).map(([key, value]: [string, any]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-sm">{key}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${value.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {value.status}
                  </div>
                  <div className="text-sm text-gray-600">
                    {value.ok ? '✅ OK' : '❌ Error'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
