/**
 * Script para analizar el tamaño del bundle de la aplicación mobile
 * 
 * Analiza:
 * - Tamaño total del bundle
 * - Tamaño de cada chunk
 * - Dependencias más pesadas
 * - Oportunidades de optimización
 * 
 * Uso:
 *   node scripts/analyze-bundle-size.js
 *   npm run analyze:bundle
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(PROJECT_ROOT, '.next');
const OUT_DIR = path.join(PROJECT_ROOT, 'out');
const PACKAGE_JSON = path.join(PROJECT_ROOT, 'package.json');

// Thresholds para alertas
const THRESHOLDS = {
  totalBundleSize: 2 * 1024 * 1024, // 2 MB
  chunkSize: 500 * 1024, // 500 KB
  dependencySize: 100 * 1024, // 100 KB
};

/**
 * Formatea bytes a formato legible
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Obtiene el tamaño de un archivo o directorio
 */
function getSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      let totalSize = 0;
      const files = fs.readdirSync(filePath);
      files.forEach(file => {
        totalSize += getSize(path.join(filePath, file));
      });
      return totalSize;
    }
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Analiza el tamaño del bundle de Next.js
 */
function analyzeNextBundle() {
  console.log('\n📦 Analizando Bundle de Next.js...\n');
  
  const bundleInfo = {
    totalSize: 0,
    chunks: [],
    staticFiles: [],
    errors: []
  };

  // Analizar directorio .next (si existe)
  if (fs.existsSync(BUILD_DIR)) {
    const staticDir = path.join(BUILD_DIR, 'static');
    if (fs.existsSync(staticDir)) {
      const chunksDir = path.join(staticDir, 'chunks');
      if (fs.existsSync(chunksDir)) {
        const chunkFiles = fs.readdirSync(chunksDir);
        chunkFiles.forEach(file => {
          const filePath = path.join(chunksDir, file);
          const size = getSize(filePath);
          bundleInfo.chunks.push({
            name: file,
            size: size,
            formatted: formatBytes(size)
          });
          bundleInfo.totalSize += size;
        });
      }

      // Analizar otros archivos estáticos
      const otherDirs = ['css', 'media'];
      otherDirs.forEach(dir => {
        const dirPath = path.join(staticDir, dir);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const size = getSize(filePath);
            bundleInfo.staticFiles.push({
              name: `${dir}/${file}`,
              size: size,
              formatted: formatBytes(size)
            });
            bundleInfo.totalSize += size;
          });
        }
      });
    }
  }

  // Analizar directorio out (build estático)
  if (fs.existsSync(OUT_DIR)) {
    const outStaticDir = path.join(OUT_DIR, '_next', 'static');
    if (fs.existsSync(outStaticDir)) {
      const chunksDir = path.join(outStaticDir, 'chunks');
      if (fs.existsSync(chunksDir)) {
        const chunkFiles = fs.readdirSync(chunksDir);
        chunkFiles.forEach(file => {
          const filePath = path.join(chunksDir, file);
          const size = getSize(filePath);
          bundleInfo.chunks.push({
            name: file,
            size: size,
            formatted: formatBytes(size)
          });
          bundleInfo.totalSize += size;
        });
      }
    }
  }

  // Ordenar chunks por tamaño
  bundleInfo.chunks.sort((a, b) => b.size - a.size);
  bundleInfo.staticFiles.sort((a, b) => b.size - a.size);

  return bundleInfo;
}

/**
 * Analiza las dependencias del package.json
 */
function analyzeDependencies() {
  console.log('\n📚 Analizando Dependencias...\n');
  
  if (!fs.existsSync(PACKAGE_JSON)) {
    return { dependencies: [], devDependencies: [] };
  }

  const packageData = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  const allDeps = {
    ...packageData.dependencies || {},
    ...packageData.devDependencies || {}
  };

  const deps = Object.keys(allDeps).map(name => ({
    name,
    version: allDeps[name],
    isDev: name in (packageData.devDependencies || {})
  }));

  return { dependencies: deps };
}

/**
 * Analiza node_modules para obtener tamaños reales
 */
function analyzeNodeModules() {
  console.log('\n📦 Analizando node_modules...\n');
  
  const nodeModulesDir = path.join(PROJECT_ROOT, 'node_modules');
  if (!fs.existsSync(nodeModulesDir)) {
    return [];
  }

  const packages = [];
  const topLevelDirs = fs.readdirSync(nodeModulesDir).filter(dir => {
    return !dir.startsWith('@') && fs.statSync(path.join(nodeModulesDir, dir)).isDirectory();
  });

  // Analizar solo los primeros 20 paquetes más grandes para no ser muy lento
  topLevelDirs.slice(0, 20).forEach(pkg => {
    const pkgPath = path.join(nodeModulesDir, pkg);
    const size = getSize(pkgPath);
    packages.push({
      name: pkg,
      size: size,
      formatted: formatBytes(size)
    });
  });

  packages.sort((a, b) => b.size - a.size);
  return packages;
}

/**
 * Genera recomendaciones de optimización
 */
function generateRecommendations(bundleInfo, nodeModules) {
  const recommendations = [];

  // Verificar tamaño total
  if (bundleInfo.totalSize > THRESHOLDS.totalBundleSize) {
    recommendations.push({
      type: 'warning',
      message: `Bundle total (${formatBytes(bundleInfo.totalSize)}) excede el threshold de ${formatBytes(THRESHOLDS.totalBundleSize)}`,
      suggestion: 'Considera code splitting y lazy loading adicional'
    });
  }

  // Verificar chunks grandes
  const largeChunks = bundleInfo.chunks.filter(chunk => chunk.size > THRESHOLDS.chunkSize);
  if (largeChunks.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `${largeChunks.length} chunk(s) exceden ${formatBytes(THRESHOLDS.chunkSize)}`,
      chunks: largeChunks.map(c => c.name),
      suggestion: 'Considera dividir estos chunks o usar dynamic imports'
    });
  }

  // Verificar dependencias grandes
  const largeDeps = nodeModules.filter(dep => dep.size > THRESHOLDS.dependencySize);
  if (largeDeps.length > 0) {
    recommendations.push({
      type: 'info',
      message: `${largeDeps.length} dependencia(s) son grandes (>${formatBytes(THRESHOLDS.dependencySize)})`,
      dependencies: largeDeps.slice(0, 10).map(d => d.name),
      suggestion: 'Revisa si todas estas dependencias son necesarias'
    });
  }

  return recommendations;
}

/**
 * Genera reporte en formato texto
 */
function generateTextReport(bundleInfo, deps, nodeModules, recommendations) {
  console.log('='.repeat(80));
  console.log('📊 REPORTE DE ANÁLISIS DE BUNDLE - RespiCare Mobile');
  console.log('='.repeat(80));

  // Resumen general
  console.log('\n📈 RESUMEN GENERAL');
  console.log('-'.repeat(80));
  console.log(`Tamaño total del bundle: ${formatBytes(bundleInfo.totalSize)}`);
  console.log(`Número de chunks: ${bundleInfo.chunks.length}`);
  console.log(`Archivos estáticos: ${bundleInfo.staticFiles.length}`);
  console.log(`Dependencias totales: ${deps.dependencies.length}`);

  // Top 10 chunks más grandes
  if (bundleInfo.chunks.length > 0) {
    console.log('\n🔝 TOP 10 CHUNKS MÁS GRANDES');
    console.log('-'.repeat(80));
    bundleInfo.chunks.slice(0, 10).forEach((chunk, index) => {
      const warning = chunk.size > THRESHOLDS.chunkSize ? ' ⚠️' : '';
      console.log(`${(index + 1).toString().padStart(2)}. ${chunk.name.padEnd(50)} ${chunk.formatted.padStart(10)}${warning}`);
    });
  }

  // Top 10 dependencias más grandes
  if (nodeModules.length > 0) {
    console.log('\n📦 TOP 10 DEPENDENCIAS MÁS GRANDES');
    console.log('-'.repeat(80));
    nodeModules.slice(0, 10).forEach((dep, index) => {
      const warning = dep.size > THRESHOLDS.dependencySize ? ' ⚠️' : '';
      console.log(`${(index + 1).toString().padStart(2)}. ${dep.name.padEnd(50)} ${dep.formatted.padStart(10)}${warning}`);
    });
  }

  // Recomendaciones
  if (recommendations.length > 0) {
    console.log('\n💡 RECOMENDACIONES DE OPTIMIZACIÓN');
    console.log('-'.repeat(80));
    recommendations.forEach((rec, index) => {
      const icon = rec.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`\n${icon} ${rec.message}`);
      if (rec.chunks) {
        console.log(`   Chunks: ${rec.chunks.join(', ')}`);
      }
      if (rec.dependencies) {
        console.log(`   Dependencias: ${rec.dependencies.join(', ')}`);
      }
      console.log(`   Sugerencia: ${rec.suggestion}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Genera reporte en formato JSON
 */
function generateJSONReport(bundleInfo, deps, nodeModules, recommendations) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalBundleSize: bundleInfo.totalSize,
      totalBundleSizeFormatted: formatBytes(bundleInfo.totalSize),
      chunksCount: bundleInfo.chunks.length,
      staticFilesCount: bundleInfo.staticFiles.length,
      dependenciesCount: deps.dependencies.length
    },
    chunks: bundleInfo.chunks,
    staticFiles: bundleInfo.staticFiles,
    topDependencies: nodeModules.slice(0, 20),
    recommendations: recommendations,
    thresholds: THRESHOLDS
  };

  const reportPath = path.join(PROJECT_ROOT, 'bundle-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Reporte JSON guardado en: ${reportPath}`);
  
  return report;
}

/**
 * Función principal
 */
function main() {
  console.log('🚀 Iniciando análisis de bundle...\n');

  try {
    // Analizar bundle
    const bundleInfo = analyzeNextBundle();
    
    // Analizar dependencias
    const deps = analyzeDependencies();
    
    // Analizar node_modules
    const nodeModules = analyzeNodeModules();
    
    // Generar recomendaciones
    const recommendations = generateRecommendations(bundleInfo, nodeModules);
    
    // Generar reportes
    generateTextReport(bundleInfo, deps, nodeModules, recommendations);
    const jsonReport = generateJSONReport(bundleInfo, deps, nodeModules, recommendations);
    
    // Exit code basado en warnings
    const hasWarnings = recommendations.some(r => r.type === 'warning');
    if (hasWarnings) {
      console.log('\n⚠️  Se encontraron advertencias. Revisa las recomendaciones.');
      process.exit(1);
    } else {
      console.log('\n✅ Análisis completado sin advertencias críticas.');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Error durante el análisis:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { main, analyzeNextBundle, analyzeDependencies, analyzeNodeModules };

