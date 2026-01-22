#!/usr/bin/env node

/**
 * Script de Validación de Modo Oscuro
 * 
 * Este script analiza los componentes del proyecto para verificar
 * que tengan soporte adecuado para modo oscuro.
 * 
 * Uso:
 *   node scripts/validate-dark-mode.js
 *   node scripts/validate-dark-mode.js --fix
 *   node scripts/validate-dark-mode.js --component=Button
 */

const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
  componentsDir: path.join(__dirname, '../apps/frontend/src/components'),
  outputFile: path.join(__dirname, '../.agent/audits/dark-mode-validation-report.json'),
  excludeDirs: ['node_modules', '.next', 'dist', 'build'],
  fileExtensions: ['.tsx', '.jsx'],
};

// Patrones a buscar
const PATTERNS = {
  // Clases que deberían tener variante dark
  needsDark: [
    /className=["'][^"']*bg-white[^"']*["']/g,
    /className=["'][^"']*bg-gray-[0-9]+[^"']*["']/g,
    /className=["'][^"']*text-black[^"']*["']/g,
    /className=["'][^"']*text-gray-[0-9]+[^"']*["']/g,
    /className=["'][^"']*border-gray-[0-9]+[^"']*["']/g,
  ],
  
  // Clases con soporte dark
  hasDark: /dark:/g,
  
  // Variables CSS del sistema (preferidas)
  usesVariables: [
    /bg-background/g,
    /bg-foreground/g,
    /bg-card/g,
    /bg-primary/g,
    /bg-secondary/g,
    /bg-muted/g,
    /text-foreground/g,
    /text-muted-foreground/g,
    /border-border/g,
  ],
};

// Resultados
const results = {
  totalFiles: 0,
  filesWithIssues: 0,
  filesWithDarkMode: 0,
  filesUsingVariables: 0,
  issues: [],
  summary: {},
};

/**
 * Analiza un archivo
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(CONFIG.componentsDir, filePath);
  
  const fileResult = {
    file: relativePath,
    hasDarkMode: false,
    usesVariables: false,
    issues: [],
    suggestions: [],
  };

  // Verificar si usa clases dark:
  const darkMatches = content.match(PATTERNS.hasDark);
  if (darkMatches && darkMatches.length > 0) {
    fileResult.hasDarkMode = true;
    results.filesWithDarkMode++;
  }

  // Verificar si usa variables CSS
  let usesVariables = false;
  for (const pattern of PATTERNS.usesVariables) {
    if (pattern.test(content)) {
      usesVariables = true;
      break;
    }
  }
  if (usesVariables) {
    fileResult.usesVariables = true;
    results.filesUsingVariables++;
  }

  // Buscar clases que necesitan variante dark
  for (const pattern of PATTERNS.needsDark) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Verificar si ya tiene variante dark
        const classContent = match.match(/className=["']([^"']*)["']/)[1];
        if (!classContent.includes('dark:')) {
          fileResult.issues.push({
            type: 'missing-dark-variant',
            line: getLineNumber(content, match),
            match: match,
            suggestion: suggestDarkVariant(classContent),
          });
        }
      });
    }
  }

  // Buscar hardcoded colors
  const hardcodedColors = [
    { pattern: /#[0-9a-fA-F]{3,6}/g, type: 'hardcoded-hex' },
    { pattern: /rgb\([^)]+\)/g, type: 'hardcoded-rgb' },
    { pattern: /rgba\([^)]+\)/g, type: 'hardcoded-rgba' },
  ];

  hardcodedColors.forEach(({ pattern, type }) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        fileResult.issues.push({
          type: type,
          line: getLineNumber(content, match),
          match: match,
          suggestion: 'Considerar usar variables CSS del sistema',
        });
      });
    }
  });

  // Agregar sugerencias
  if (!fileResult.hasDarkMode && !fileResult.usesVariables) {
    fileResult.suggestions.push('Agregar soporte para modo oscuro usando clases dark: o variables CSS');
  }
  
  if (!fileResult.usesVariables && fileResult.hasDarkMode) {
    fileResult.suggestions.push('Considerar migrar a variables CSS del sistema para mejor mantenibilidad');
  }

  if (fileResult.issues.length > 0) {
    results.filesWithIssues++;
    results.issues.push(fileResult);
  }

  return fileResult;
}

/**
 * Obtiene el número de línea de un match
 */
function getLineNumber(content, match) {
  const index = content.indexOf(match);
  if (index === -1) return 0;
  return content.substring(0, index).split('\n').length;
}

/**
 * Sugiere una variante dark para una clase
 */
function suggestDarkVariant(classContent) {
  const suggestions = {
    'bg-white': 'dark:bg-gray-900',
    'bg-gray-50': 'dark:bg-gray-900',
    'bg-gray-100': 'dark:bg-gray-800',
    'bg-gray-200': 'dark:bg-gray-700',
    'text-black': 'dark:text-white',
    'text-gray-900': 'dark:text-white',
    'text-gray-800': 'dark:text-gray-100',
    'text-gray-700': 'dark:text-gray-200',
    'text-gray-600': 'dark:text-gray-300',
    'text-gray-500': 'dark:text-gray-400',
    'border-gray-200': 'dark:border-gray-700',
    'border-gray-300': 'dark:border-gray-600',
  };

  const classes = classContent.split(' ');
  const newClasses = [...classes];

  classes.forEach(cls => {
    if (suggestions[cls]) {
      newClasses.push(suggestions[cls]);
    }
  });

  return newClasses.join(' ');
}

/**
 * Recorre directorios recursivamente
 */
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!CONFIG.excludeDirs.includes(file)) {
        walkDir(filePath, callback);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (CONFIG.fileExtensions.includes(ext)) {
        callback(filePath);
      }
    }
  });
}

/**
 * Genera reporte
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: results.totalFiles,
      filesWithDarkMode: results.filesWithDarkMode,
      filesWithIssues: results.filesWithIssues,
      filesUsingVariables: results.filesUsingVariables,
      coveragePercentage: ((results.filesWithDarkMode / results.totalFiles) * 100).toFixed(2),
      variablesUsagePercentage: ((results.filesUsingVariables / results.totalFiles) * 100).toFixed(2),
    },
    issues: results.issues,
    recommendations: generateRecommendations(),
  };

  return report;
}

/**
 * Genera recomendaciones
 */
function generateRecommendations() {
  const recommendations = [];

  const coveragePercentage = (results.filesWithDarkMode / results.totalFiles) * 100;
  
  if (coveragePercentage < 50) {
    recommendations.push({
      priority: 'high',
      message: `Solo ${coveragePercentage.toFixed(1)}% de los componentes tienen soporte para modo oscuro. Se recomienda priorizar la implementación.`,
    });
  } else if (coveragePercentage < 80) {
    recommendations.push({
      priority: 'medium',
      message: `${coveragePercentage.toFixed(1)}% de los componentes tienen soporte para modo oscuro. Continuar mejorando la cobertura.`,
    });
  } else {
    recommendations.push({
      priority: 'low',
      message: `Excelente cobertura de modo oscuro (${coveragePercentage.toFixed(1)}%). Mantener el estándar en nuevos componentes.`,
    });
  }

  const variablesPercentage = (results.filesUsingVariables / results.totalFiles) * 100;
  
  if (variablesPercentage < 30) {
    recommendations.push({
      priority: 'medium',
      message: `Solo ${variablesPercentage.toFixed(1)}% de los componentes usan variables CSS del sistema. Considerar migración gradual.`,
    });
  }

  if (results.filesWithIssues > 0) {
    recommendations.push({
      priority: 'high',
      message: `${results.filesWithIssues} archivos tienen problemas potenciales. Revisar el reporte detallado.`,
    });
  }

  return recommendations;
}

/**
 * Imprime reporte en consola
 */
function printReport(report) {
  console.log('\n🌙 Reporte de Validación de Modo Oscuro\n');
  console.log('═'.repeat(60));
  
  console.log('\n📊 Resumen:');
  console.log(`  Total de archivos analizados: ${report.summary.totalFiles}`);
  console.log(`  Archivos con modo oscuro: ${report.summary.filesWithDarkMode} (${report.summary.coveragePercentage}%)`);
  console.log(`  Archivos usando variables CSS: ${report.summary.filesUsingVariables} (${report.summary.variablesUsagePercentage}%)`);
  console.log(`  Archivos con problemas: ${report.summary.filesWithIssues}`);
  
  console.log('\n💡 Recomendaciones:');
  report.recommendations.forEach(rec => {
    const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
    console.log(`  ${icon} [${rec.priority.toUpperCase()}] ${rec.message}`);
  });

  if (report.issues.length > 0) {
    console.log('\n⚠️  Problemas Encontrados:');
    report.issues.slice(0, 10).forEach(issue => {
      console.log(`\n  📄 ${issue.file}`);
      if (issue.issues.length > 0) {
        console.log(`     Problemas: ${issue.issues.length}`);
        issue.issues.slice(0, 3).forEach(i => {
          console.log(`       - Línea ${i.line}: ${i.type}`);
        });
      }
      if (issue.suggestions.length > 0) {
        console.log(`     Sugerencias:`);
        issue.suggestions.forEach(s => {
          console.log(`       - ${s}`);
        });
      }
    });

    if (report.issues.length > 10) {
      console.log(`\n  ... y ${report.issues.length - 10} archivos más con problemas.`);
    }
  }

  console.log('\n═'.repeat(60));
  console.log(`\n📝 Reporte completo guardado en: ${CONFIG.outputFile}\n`);
}

/**
 * Main
 */
function main() {
  console.log('🔍 Analizando componentes...\n');

  // Analizar todos los archivos
  walkDir(CONFIG.componentsDir, (filePath) => {
    results.totalFiles++;
    analyzeFile(filePath);
  });

  // Generar reporte
  const report = generateReport();

  // Guardar reporte
  const outputDir = path.dirname(CONFIG.outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(report, null, 2));

  // Imprimir reporte
  printReport(report);

  // Exit code
  process.exit(report.summary.filesWithIssues > 0 ? 1 : 0);
}

// Ejecutar
if (require.main === module) {
  main();
}

module.exports = { analyzeFile, generateReport };
