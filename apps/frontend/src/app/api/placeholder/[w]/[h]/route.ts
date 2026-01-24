import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  context: { params: { w: string; h: string } }
) {
  const w = Math.max(1, Math.min(4096, parseInt(context.params.w || '300', 10) || 300));
  const h = Math.max(1, Math.min(4096, parseInt(context.params.h || '300', 10) || 300));

  const bg = '#e5e7eb'; // slate-200
  const fg = '#9ca3af'; // gray-400
  const text = `${w}×${h}`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="${bg}"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            fill="${fg}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(12, Math.floor(Math.min(w, h) / 8))}">
        ${text}
      </text>
    </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=604800, immutable'
    }
  });
}
