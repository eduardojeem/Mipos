/**
 * Migrar recursos de /home hacia Supabase Storage para administración en /admin/business-config.
 *
 * Uso:
 *  - ts-node scripts/migrate-home-assets-to-storage.ts --base=/home/app --execute
 *  - Variables necesarias:
 *    - SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 *
 * Seguridad:
 *  - Solo migra rutas en lista blanca.
 *  - No toca archivos críticos (.env, keys, logs, backups, scripts).
 *  - Por defecto ejecuta en modo dry-run (sin subir). Use --execute para subir.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

type ResourceMap = {
  name: string;
  sourcePath: string; // relativo al --base
  bucket: string;
  destPath: (fileName: string, absSource: string) => string; // ruta en el bucket
  public: boolean; // visibilidad del bucket
  includeExtensions?: string[]; // filtro simple por extensión
  includeDirs?: boolean; // si debe recorrer directorios
};

function getEnv(key: string): string | undefined {
  return process.env[key];
}

function createAdmin() {
  const url = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Faltan SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno');
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string | boolean> = { base: '/home/app', execute: false };
  for (const a of args) {
    if (a.startsWith('--base=')) out.base = a.substring('--base='.length);
    else if (a === '--execute') out.execute = true;
    else if (a === '--dry-run') out.execute = false;
  }
  return out as { base: string; execute: boolean };
}

function isFileReadable(p: string) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    const s = fs.statSync(p);
    return s.isFile();
  } catch {
    return false;
  }
}

function getContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    case '.pdf': return 'application/pdf';
    case '.json': return 'application/json';
    case '.html': return 'text/html';
    case '.md': return 'text/markdown';
    case '.csv': return 'text/csv';
    default: return 'application/octet-stream';
  }
}

function listFiles(absDir: string, includeExtensions?: string[]): string[] {
  const result: string[] = [];
  function walk(d: string) {
    if (!fs.existsSync(d)) return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) {
        if (!includeExtensions || includeExtensions.length === 0) result.push(p);
        else {
          const ext = path.extname(e.name).toLowerCase().replace('.', '');
          if (includeExtensions.includes(ext)) result.push(p);
        }
      }
    }
  }
  walk(absDir);
  return result;
}

async function ensureBucket(admin: any, bucket: string, isPublic: boolean) {
  try {
    await admin.storage.createBucket(bucket, { public: isPublic });
  } catch {}
  try {
    await admin.storage.updateBucket(bucket, { public: isPublic });
  } catch {}
}

async function uploadFile(admin: any, bucket: string, destPath: string, localPath: string, contentType: string) {
  const buf = fs.readFileSync(localPath);
  const { error } = await admin.storage.from(bucket).upload(destPath, buf, { contentType, upsert: true });
  if (error) throw new Error(`Upload error (${bucket}/${destPath}): ${error.message}`);
}

async function main() {
  const { base, execute } = parseArgs();
  const admin = createAdmin();

  const maps: ResourceMap[] = [
    {
      name: 'logo principal',
      sourcePath: 'assets',
      bucket: 'branding',
      public: true,
      includeExtensions: ['png', 'jpg', 'jpeg', 'svg'],
      includeDirs: false,
      destPath: (fileName) => `logo/${fileName}`,
    },
    {
      name: 'favicon',
      sourcePath: 'assets',
      bucket: 'branding',
      public: true,
      includeExtensions: ['ico', 'png', 'svg'],
      includeDirs: false,
      destPath: (fileName) => `favicon/${fileName}`,
    },
    {
      name: 'carrusel',
      sourcePath: 'assets/carousel',
      bucket: 'carousel',
      public: true,
      includeExtensions: ['png', 'jpg', 'jpeg', 'webp'],
      includeDirs: true,
      destPath: (fileName) => {
        const now = new Date();
        const yyyy = String(now.getFullYear());
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        return `${yyyy}/${mm}/${fileName}`;
      },
    },
    {
      name: 'banners/promociones',
      sourcePath: 'assets/promotions',
      bucket: 'content',
      public: true,
      includeExtensions: ['png', 'jpg', 'jpeg', 'webp'],
      includeDirs: true,
      destPath: (fileName) => `promotions/${fileName}`,
    },
    {
      name: 'términos y privacidad',
      sourcePath: 'docs',
      bucket: 'legal',
      public: true,
      includeExtensions: ['pdf'],
      includeDirs: false,
      destPath: (fileName) => `${fileName.toLowerCase().includes('privacy') ? 'privacy' : 'terms'}.pdf`,
    },
    {
      name: 'plantillas email',
      sourcePath: 'email/templates',
      bucket: 'templates',
      public: false,
      includeExtensions: ['html', 'mjml'],
      includeDirs: true,
      destPath: (fileName, absSource) => {
        const rel = path.relative(path.join(base, 'email', 'templates'), absSource).replace(/\\/g, '/');
        return `email/${rel}`;
      },
    },
    {
      name: 'plantillas reportes',
      sourcePath: 'reports/templates',
      bucket: 'templates',
      public: false,
      includeExtensions: ['html', 'md'],
      includeDirs: true,
      destPath: (fileName, absSource) => {
        const rel = path.relative(path.join(base, 'reports', 'templates'), absSource).replace(/\\/g, '/');
        return `reports/${rel}`;
      },
    },
    {
      name: 'horarios negocio',
      sourcePath: 'config',
      bucket: 'config',
      public: false,
      includeExtensions: ['json'],
      includeDirs: false,
      destPath: (fileName) => `business-hours/${fileName}`,
    },
    {
      name: 'tablas de precio CSV',
      sourcePath: 'data/pricing',
      bucket: 'data',
      public: false,
      includeExtensions: ['csv'],
      includeDirs: true,
      destPath: (fileName) => `pricing/${fileName}`,
    },
  ];

  const report: Array<{ name: string; bucket: string; public: boolean; uploads: Array<{ from: string; to: string; ok: boolean; error?: string }> }> = [];

  for (const m of maps) {
    const absSourceDir = path.join(base, m.sourcePath);
    const exists = fs.existsSync(absSourceDir);
    console.log(`\n[${m.name}] Fuente: ${absSourceDir} ${exists ? '' : '(no existe)'}`);
    await ensureBucket(admin, m.bucket, m.public);

    const uploads: Array<{ from: string; to: string; ok: boolean; error?: string }> = [];
    if (!exists) {
      report.push({ name: m.name, bucket: m.bucket, public: m.public, uploads });
      continue;
    }

    const files = m.includeDirs ? listFiles(absSourceDir, m.includeExtensions) : fs.readdirSync(absSourceDir)
      .filter(f => {
        const p = path.join(absSourceDir, f);
        const isFile = fs.existsSync(p) && fs.statSync(p).isFile();
        if (!isFile) return false;
        if (!m.includeExtensions || m.includeExtensions.length === 0) return true;
        const ext = path.extname(f).toLowerCase().replace('.', '');
        return m.includeExtensions.includes(ext);
      })
      .map(f => path.join(absSourceDir, f));

    for (const p of files) {
      const fileName = path.basename(p);
      if (!isFileReadable(p)) {
        uploads.push({ from: p, to: '', ok: false, error: 'No legible o no es archivo' });
        continue;
      }
      const dest = m.destPath(fileName, p);
      console.log(`  - ${execute ? 'Subiendo' : 'Dry-run'}: ${p} -> ${m.bucket}/${dest}`);
      let ok = true; let error: string | undefined;
      if (execute) {
        try {
          await uploadFile(admin, m.bucket, dest, p, getContentType(fileName));
        } catch (e: any) {
          ok = false; error = e?.message || String(e);
        }
      }
      uploads.push({ from: p, to: `${m.bucket}/${dest}`, ok, error });
    }
    report.push({ name: m.name, bucket: m.bucket, public: m.public, uploads });
  }

  const outDir = path.join(process.cwd(), 'scripts', 'out');
  try { fs.mkdirSync(outDir, { recursive: true }); } catch {}
  fs.writeFileSync(path.join(outDir, 'migrate-admin-assets-report.json'), JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nReporte escrito en scripts/out/migrate-admin-assets-report.json`);
  console.log(`\nFinalizado. Modo: ${execute ? 'ejecución' : 'dry-run'}`);
}

main().catch((e) => {
  console.error('Error en migración:', e);
  process.exit(1);
});