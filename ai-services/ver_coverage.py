"""
Script mejorado para ver el coverage de ai-services con información detallada
y análisis de la situación real de las pruebas
"""
import os
import sys
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
import json

def format_percentage(value):
    """Formatea un valor como porcentaje"""
    return f"{value:.2f}%"

def get_coverage_color(coverage):
    """Obtiene un símbolo según el nivel de cobertura"""
    if coverage >= 50:
        return "✅"
    elif coverage >= 35:
        return "🟡"
    else:
        return "❌"

def analyze_test_structure():
    """Analiza la estructura de tests para identificar qué módulos tienen tests"""
    test_dir = Path('tests')
    if not test_dir.exists():
        return {}
    
    test_structure = {
        'core': False,
        'services': False,
        'api': False,
        'strategies': False,
        'decorators': False,
        'repositories': False,
        'factories': False,
        'circuit_breaker': False,
        'utils': False,
        'patterns': False
    }
    
    # Verificar existencia de directorios de tests
    if (test_dir / 'core').exists():
        test_structure['core'] = len(list((test_dir / 'core').glob('test_*.py'))) > 0
    
    if (test_dir / 'services').exists():
        test_structure['services'] = len(list((test_dir / 'services').glob('test_*.py'))) > 0
    
    if (test_dir / 'api').exists():
        test_structure['api'] = len(list((test_dir / 'api').glob('test_*.py'))) > 0
    
    if (test_dir / 'patterns').exists():
        test_structure['patterns'] = len(list((test_dir / 'patterns').glob('test_*.py'))) > 0
    
    if (test_dir / 'decorators').exists():
        test_structure['decorators'] = len(list((test_dir / 'decorators').glob('test_*.py'))) > 0
    
    if (test_dir / 'repositories').exists():
        test_structure['repositories'] = len(list((test_dir / 'repositories').glob('test_*.py'))) > 0
    
    if (test_dir / 'factories').exists():
        test_structure['factories'] = len(list((test_dir / 'factories').glob('test_*.py'))) > 0
    
    if (test_dir / 'circuit_breaker').exists():
        test_structure['circuit_breaker'] = len(list((test_dir / 'circuit_breaker').glob('test_*.py'))) > 0
    
    if (test_dir / 'utils').exists():
        test_structure['utils'] = len(list((test_dir / 'utils').glob('test_*.py'))) > 0
    
    return test_structure

def count_test_files():
    """Cuenta el número de archivos de test"""
    test_dir = Path('tests')
    if not test_dir.exists():
        return 0
    
    test_files = list(test_dir.rglob('test_*.py'))
    return len(test_files)

def get_module_coverage_details(root):
    """Obtiene detalles de cobertura por módulo"""
    classes = root.findall('.//class')
    module_details = {}
    
    for cls in classes:
        filename = cls.get('filename', '')
        if not filename:
            continue
        
        # Determinar módulo basado en la ruta del archivo
        if filename.startswith('core/'):
            module = 'core'
        elif filename.startswith('services/'):
            module = 'services'
        elif filename.startswith('api/'):
            module = 'api'
        elif filename.startswith('strategies/'):
            module = 'strategies'
        elif filename.startswith('decorators/'):
            module = 'decorators'
        elif filename.startswith('repositories/'):
            module = 'repositories'
        elif filename.startswith('factories/'):
            module = 'factories'
        elif filename.startswith('circuit_breaker/'):
            module = 'circuit_breaker'
        elif filename.startswith('utils/'):
            module = 'utils'
        elif filename == 'main.py':
            module = 'main'
        else:
            module = 'other'
        
        if module not in module_details:
            module_details[module] = {
                'files': [],
                'total_lines': 0,
                'covered_lines': 0
            }
        
        lines_covered = int(cls.get('lines-covered', 0))
        lines_valid = int(cls.get('lines-valid', 0))
        
        module_details[module]['files'].append({
            'filename': filename,
            'lines_covered': lines_covered,
            'lines_valid': lines_valid,
            'coverage': (lines_covered / lines_valid * 100) if lines_valid > 0 else 0
        })
        
        module_details[module]['total_lines'] += lines_valid
        module_details[module]['covered_lines'] += lines_covered
    
    # Calcular cobertura por módulo
    for module in module_details:
        total = module_details[module]['total_lines']
        covered = module_details[module]['covered_lines']
        module_details[module]['coverage'] = (covered / total * 100) if total > 0 else 0
        module_details[module]['file_count'] = len(module_details[module]['files'])
    
    return module_details

def ver_coverage():
    """Ver el coverage desde el archivo XML con información detallada"""
    xml_file = 'coverage.xml'
    
    if not os.path.exists(xml_file):
        print("=" * 80)
        print("❌ REPORTE DE COBERTURA - AI SERVICES")
        print("=" * 80)
        print(f"\n❌ Archivo {xml_file} no encontrado")
        print("\n💡 Para generar el archivo, ejecuta:")
        print("\n   Windows PowerShell:")
        print("   $env:TESTING='true'")
        print("   $env:AI_RATE_LIMIT_ENABLED='0'")
        print("   pytest --cov=./ --cov-report=xml:coverage.xml")
        print("\n   Linux/WSL:")
        print("   export TESTING=true")
        print("   export AI_RATE_LIMIT_ENABLED=0")
        print("   pytest --cov=./ --cov-report=xml:coverage.xml")
        print("\n" + "=" * 80)
        return
    
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
        
        # Obtener información general
        coverage_rate = float(root.attrib.get('line-rate', 0))
        coverage_percent = coverage_rate * 100
        
        lines_covered = int(root.attrib.get('lines-covered', 0))
        lines_valid = int(root.attrib.get('lines-valid', 0))
        lines_missing = lines_valid - lines_covered
        
        branches_covered = int(root.attrib.get('branches-covered', 0))
        branches_valid = int(root.attrib.get('branches-valid', 0))
        
        # Información del timestamp si está disponible
        timestamp = root.attrib.get('timestamp', '')
        if timestamp:
            try:
                timestamp_dt = datetime.fromtimestamp(int(timestamp) / 1000)
                date_str = timestamp_dt.strftime('%Y-%m-%d %H:%M:%S')
            except:
                date_str = "Fecha no disponible"
        else:
            date_str = "Fecha no disponible"
        
        # Analizar estructura de tests
        test_structure = analyze_test_structure()
        test_file_count = count_test_files()
        module_details = get_module_coverage_details(root)
        
        # Obtener información por paquetes
        packages = root.findall('.//package')
        packages_info = []
        
        for pkg in packages:
            pkg_name = pkg.get('name', '')
            pkg_coverage = float(pkg.get('line-rate', 0)) * 100
            pkg_lines_covered = int(pkg.get('lines-covered', 0))
            pkg_lines_valid = int(pkg.get('lines-valid', 0))
            
            packages_info.append({
                'name': pkg_name,
                'coverage': pkg_coverage,
                'lines_covered': pkg_lines_covered,
                'lines_valid': pkg_lines_valid
            })
        
        # Ordenar por cobertura (menor primero para identificar áreas de mejora)
        packages_info.sort(key=lambda x: x['coverage'])
        
        # Calcular objetivos
        objetivo_minimo = 35.0
        objetivo_meta = 50.0
        objetivo_final = 60.0
        
        gap_minimo = max(0, objetivo_minimo - coverage_percent)
        gap_meta = max(0, objetivo_meta - coverage_percent)
        
        # Mostrar reporte
        print("\n" + "=" * 80)
        print("📊 REPORTE COMPLETO DE COBERTURA Y SITUACIÓN DE PRUEBAS - AI SERVICES")
        print("=" * 80)
        print(f"\n📅 Fecha del reporte: {date_str}")
        
        print("\n" + "-" * 80)
        print("📈 RESUMEN GENERAL")
        print("-" * 80)
        
        status_icon = get_coverage_color(coverage_percent)
        print(f"\n{status_icon} Cobertura Total: {format_percentage(coverage_percent)}")
        print(f"   Líneas cubiertas: {lines_covered:,} / {lines_valid:,}")
        print(f"   Líneas faltantes: {lines_missing:,}")
        
        if branches_valid > 0:
            branch_coverage = (branches_covered / branches_valid) * 100
            print(f"   Branches cubiertos: {branches_covered:,} / {branches_valid:,} ({format_percentage(branch_coverage)})")
        
        print(f"\n📁 Archivos de test encontrados: {test_file_count}")
        
        # Objetivos
        print("\n" + "-" * 80)
        print("🎯 OBJETIVOS DE COBERTURA")
        print("-" * 80)
        
        print(f"\n📌 Objetivo Mínimo: {format_percentage(objetivo_minimo)} (umbral CI/CD)")
        if coverage_percent >= objetivo_minimo:
            print(f"   ✅ CUMPLIDO (por encima en {format_percentage(coverage_percent - objetivo_minimo)})")
        else:
            print(f"   ❌ Pendiente (falta {format_percentage(gap_minimo)})")
        
        print(f"\n🎯 Objetivo Meta: {format_percentage(objetivo_meta)}")
        if coverage_percent >= objetivo_meta:
            print(f"   ✅ CUMPLIDO (por encima en {format_percentage(coverage_percent - objetivo_meta)})")
        else:
            print(f"   ⏳ En progreso (falta {format_percentage(gap_meta)})")
            progreso_meta = ((coverage_percent - objetivo_minimo) / (objetivo_meta - objetivo_minimo)) * 100
            progreso_meta = max(0, min(100, progreso_meta))
            print(f"   📊 Progreso: {format_percentage(progreso_meta)} del camino hacia 50%")
        
        print(f"\n🚀 Objetivo Final: {format_percentage(objetivo_final)}+")
        if coverage_percent >= objetivo_final:
            print(f"   ✅ CUMPLIDO")
        else:
            gap_final = max(0, objetivo_final - coverage_percent)
            print(f"   ⏳ Pendiente (falta {format_percentage(gap_final)})")
        
        # Progreso visual
        print("\n" + "-" * 80)
        print("📊 PROGRESO VISUAL")
        print("-" * 80)
        
        bar_length = 50
        filled = int((coverage_percent / objetivo_meta) * bar_length)
        filled = min(bar_length, filled)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"\n[{bar}] {format_percentage(coverage_percent)}")
        print(f"   {' ' * filled}▲ Actual")
        print(f"   {' ' * int((objetivo_minimo / objetivo_meta) * bar_length)}│ Mínimo (35%)")
        print(f"   {' ' * bar_length}│ Meta (50%)")
        
        # Análisis por módulo
        if module_details:
            print("\n" + "-" * 80)
            print("📦 COBERTURA POR MÓDULO")
            print("-" * 80)
            print(f"\n{'Módulo':<25} {'Cobertura':<12} {'Archivos':<10} {'Líneas':<20}")
            print("-" * 67)
            
            # Ordenar módulos por cobertura
            sorted_modules = sorted(module_details.items(), key=lambda x: x[1]['coverage'])
            
            for module_name, details in sorted_modules:
                cov = details['coverage']
                file_count = details['file_count']
                lines_info = f"{details['covered_lines']}/{details['total_lines']}"
                status_icon = get_coverage_color(cov)
                print(f"{module_name:<25} {status_icon} {format_percentage(cov):<10} {file_count:<10} {lines_info}")
        
        # Estructura de tests
        print("\n" + "-" * 80)
        print("🧪 SITUACIÓN DE TESTS POR MÓDULO")
        print("-" * 80)
        print(f"\n{'Módulo':<25} {'Tiene Tests':<15} {'Estado':<20}")
        print("-" * 60)
        
        test_status_map = {
            'core': 'Core',
            'services': 'Services',
            'api': 'API Routes',
            'patterns': 'Patterns',
            'decorators': 'Decorators',
            'repositories': 'Repositories',
            'factories': 'Factories',
            'circuit_breaker': 'Circuit Breaker',
            'utils': 'Utils'
        }
        
        for key, label in test_status_map.items():
            has_tests = test_structure.get(key, False)
            status = "✅ Con tests" if has_tests else "❌ Sin tests"
            print(f"{label:<25} {'✅' if has_tests else '❌':<15} {status}")
        
        # Top 10 módulos con menor cobertura
        if packages_info:
            print("\n" + "-" * 80)
            print("🔍 TOP 10 MÓDULOS CON MENOR COBERTURA (Áreas de Oportunidad)")
            print("-" * 80)
            print(f"\n{'Módulo':<50} {'Cobertura':<12} {'Líneas':<20}")
            print("-" * 82)
            
            for i, pkg in enumerate(packages_info[:10], 1):
                pkg_name = pkg['name'] if pkg['name'] != '.' else '(raíz)'
                pkg_name = pkg_name[:48]  # Truncar si es muy largo
                pkg_cov = pkg['coverage']
                pkg_lines = f"{pkg['lines_covered']}/{pkg['lines_valid']}"
                
                status_icon = get_coverage_color(pkg_cov)
                print(f"{i:2}. {pkg_name:<48} {status_icon} {format_percentage(pkg_cov):<10} {pkg_lines}")
        
        # Top 5 módulos con mayor cobertura
        if len(packages_info) > 10:
            print("\n" + "-" * 80)
            print("⭐ TOP 5 MÓDULOS CON MAYOR COBERTURA")
            print("-" * 80)
            print(f"\n{'Módulo':<50} {'Cobertura':<12} {'Líneas':<20}")
            print("-" * 82)
            
            top_packages = sorted(packages_info, key=lambda x: x['coverage'], reverse=True)[:5]
            for i, pkg in enumerate(top_packages, 1):
                pkg_name = pkg['name'] if pkg['name'] != '.' else '(raíz)'
                pkg_name = pkg_name[:48]
                pkg_cov = pkg['coverage']
                pkg_lines = f"{pkg['lines_covered']}/{pkg['lines_valid']}"
                
                status_icon = get_coverage_color(pkg_cov)
                print(f"{i}. {pkg_name:<48} {status_icon} {format_percentage(pkg_cov):<10} {pkg_lines}")
        
        # Recomendaciones
        print("\n" + "-" * 80)
        print("💡 RECOMENDACIONES Y PRÓXIMOS PASOS")
        print("-" * 80)
        
        if coverage_percent < objetivo_minimo:
            print("\n⚠️  La cobertura está por debajo del umbral mínimo (35%)")
            print("   Prioridad: Aumentar cobertura de módulos core críticos")
            print("   Ver: ai-services/docs/COVERAGE_IMPROVEMENT_PLAN.md - Fase 1")
        elif coverage_percent < objetivo_meta:
            print(f"\n📈 Cobertura en progreso hacia el objetivo del 50%")
            print(f"   Progreso: {format_percentage(progreso_meta)} completo")
            
            # Identificar módulos que necesitan atención
            modulos_bajos = [m for m, d in module_details.items() if d['coverage'] < 35]
            if modulos_bajos:
                print(f"\n   ⚠️  Módulos que necesitan atención (<35%):")
                for mod in modulos_bajos[:5]:
                    print(f"      - {mod}: {format_percentage(module_details[mod]['coverage'])}")
            
            print("\n   Continuar con: Fase 2 y 3 del plan de mejora")
        else:
            print(f"\n✅ ¡Excelente! La cobertura supera el objetivo del 50%")
            print("   Considerar avanzar hacia el objetivo final del 60%+")
            print("   Ver: ai-services/docs/COVERAGE_IMPROVEMENT_PLAN.md - Fase 4")
        
        # Módulos sin tests
        modulos_sin_tests = [label for key, label in test_status_map.items() if not test_structure.get(key, False)]
        if modulos_sin_tests:
            print(f"\n⚠️  Módulos sin tests detectados:")
            for mod in modulos_sin_tests:
                print(f"   - {mod}")
            print("   Acción: Crear tests para estos módulos según el plan de mejora")
        
        # Comandos útiles
        print("\n" + "-" * 80)
        print("🔧 COMANDOS ÚTILES")
        print("-" * 80)
        print("\n📋 Ver coverage por módulo específico:")
        print("   pytest --cov=core --cov-report=term-missing tests/core/")
        print("   pytest --cov=services --cov-report=term-missing tests/services/")
        print("   pytest --cov=api --cov-report=term-missing tests/api/")
        print("\n📋 Generar reporte HTML detallado:")
        print("   pytest --cov=./ --cov-report=html:htmlcov")
        print("   # Luego abre: htmlcov/index.html")
        print("\n📋 Ver plan de mejora completo:")
        print("   Ver: ai-services/docs/COVERAGE_IMPROVEMENT_PLAN.md")
        print("\n📋 Regenerar reporte de coverage:")
        print("   pytest --cov=./ --cov-config=.coveragerc --cov-report=xml:coverage.xml")
        
        print("\n" + "=" * 80 + "\n")
        
    except Exception as e:
        print("=" * 80)
        print("❌ ERROR AL LEER REPORTE DE COBERTURA")
        print("=" * 80)
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        print(f"\n💡 Verifica que el archivo {xml_file} sea válido")
        print("   Regenera el reporte ejecutando los tests con coverage")
        print("\n" + "=" * 80)

if __name__ == "__main__":
    ver_coverage()
