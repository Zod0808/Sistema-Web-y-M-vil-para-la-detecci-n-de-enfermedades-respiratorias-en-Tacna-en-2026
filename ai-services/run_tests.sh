#!/bin/bash
# Script para ejecutar pruebas en AI Services - Linux/Mac
# Uso: ./run_tests.sh [opcion]

echo ""
echo "===================================="
echo "   AI Services - Test Runner"
echo "===================================="
echo ""

case "$1" in
    all)
        echo "[*] Ejecutando TODAS las pruebas..."
        pytest -v
        ;;
    quick)
        echo "[*] Ejecutando pruebas rápidas..."
        pytest -q
        ;;
    coverage)
        echo "[*] Ejecutando pruebas con cobertura..."
        pytest --cov=. --cov-report=term-missing --cov-report=html
        echo ""
        echo "[+] Reporte HTML generado en: htmlcov/index.html"
        ;;
    patterns)
        echo "[*] Ejecutando pruebas de patrones..."
        pytest tests/patterns/ -v
        ;;
    services)
        echo "[*] Ejecutando pruebas de servicios..."
        pytest tests/services/ -v
        ;;
    strategy)
        echo "[*] Ejecutando pruebas de Strategy Pattern..."
        pytest tests/patterns/test_strategy_pattern.py -v
        ;;
    factory)
        echo "[*] Ejecutando pruebas de Factory Pattern..."
        pytest tests/patterns/test_factory_pattern.py -v
        ;;
    circuit)
        echo "[*] Ejecutando pruebas de Circuit Breaker Pattern..."
        pytest tests/patterns/test_circuit_breaker_pattern.py -v
        ;;
    repository)
        echo "[*] Ejecutando pruebas de Repository Pattern..."
        pytest tests/patterns/test_repository_pattern.py -v
        ;;
    decorator)
        echo "[*] Ejecutando pruebas de Decorator Pattern..."
        pytest tests/patterns/test_decorator_pattern.py -v
        ;;
    report)
        echo "[*] Generando reporte completo..."
        pytest --cov=. --cov-report=html --html=test-report.html --self-contained-html -v
        echo ""
        echo "[+] Reportes generados:"
        echo "    - Cobertura: htmlcov/index.html"
        echo "    - Resultados: test-report.html"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open htmlcov/index.html
        else
            xdg-open htmlcov/index.html 2>/dev/null
        fi
        ;;
    parallel)
        echo "[*] Ejecutando pruebas en paralelo..."
        pytest -n auto -v
        ;;
    failed)
        echo "[*] Re-ejecutando pruebas que fallaron..."
        pytest --lf -v
        ;;
    ci)
        echo "[*] Ejecutando en modo CI/CD..."
        pytest --cov=. --cov-report=xml --cov-report=term --maxfail=5 -n auto
        ;;
    clean)
        echo "[*] Limpiando archivos de test..."
        rm -rf .pytest_cache __pycache__ .coverage htmlcov test-report.html coverage.xml
        find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
        echo "[+] Limpieza completada"
        ;;
    install)
        echo "[*] Instalando dependencias de testing..."
        pip install -r requirements.txt
        pip install -r requirements-test.txt
        python -m spacy download es_core_news_md
        echo "[+] Instalación completada"
        ;;
    "")
        echo "Opciones disponibles:"
        echo ""
        echo "  all         - Ejecutar todas las pruebas"
        echo "  quick       - Pruebas rápidas sin cobertura"
        echo "  coverage    - Pruebas con reporte de cobertura"
        echo "  patterns    - Solo pruebas de patrones"
        echo "  services    - Solo pruebas de servicios"
        echo "  strategy    - Solo Strategy Pattern"
        echo "  factory     - Solo Factory Pattern"
        echo "  circuit     - Solo Circuit Breaker Pattern"
        echo "  repository  - Solo Repository Pattern"
        echo "  decorator   - Solo Decorator Pattern"
        echo "  report      - Generar reporte HTML completo"
        echo "  parallel    - Ejecutar en paralelo"
        echo "  failed      - Re-ejecutar pruebas fallidas"
        echo "  ci          - Modo CI/CD"
        echo "  clean       - Limpiar archivos de test"
        echo "  install     - Instalar dependencias"
        echo ""
        echo "Ejemplo: ./run_tests.sh coverage"
        echo ""
        ;;
    *)
        echo "[!] Opción no válida: $1"
        echo "    Use './run_tests.sh' para ver opciones disponibles"
        exit 1
        ;;
esac

echo ""
echo "===================================="

