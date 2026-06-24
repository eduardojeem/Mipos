import React from 'react';

/**
 * Render seguro del cuerpo legal editable.
 * Convenciones: "## " = subtítulo, "- " = ítem de lista, bloques separados por
 * línea en blanco = párrafos. NO interpreta HTML (construye elementos React),
 * por lo que no hay riesgo de XSS aunque el texto venga de la base de datos.
 */
export function LegalBody({ text }: { text: string }) {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <>
      {blocks.map((block, i) => {
        if (block.startsWith('## ')) {
          return (
            <h2 key={i} className="pt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {block.slice(3).trim()}
            </h2>
          );
        }

        const lines = block
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length > 0 && lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{l.slice(2).trim()}</li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{lines.join(' ')}</p>;
      })}
    </>
  );
}
