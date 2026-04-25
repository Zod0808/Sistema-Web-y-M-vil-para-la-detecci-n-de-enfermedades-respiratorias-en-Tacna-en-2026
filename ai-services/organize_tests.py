"""
Script para organizar archivos de test en sus carpetas correspondientes
"""
import os
import shutil
from pathlib import Path

def organize_tests():
    """Organiza los archivos de test en sus carpetas correspondientes"""
    
    base_path = Path(__file__).parent / "tests"
    
    # Definir movimientos: (archivo_origen, carpeta_destino, nuevo_nombre_opcional)
    moves = [
        # Tests de API endpoints → tests/api/
        ("test_main.py", "api", "test_main_endpoints.py"),
        ("test_advanced_ml_endpoints.py", "api", None),
        ("test_advanced_nlp_endpoints.py", "api", None),
        ("test_automl_endpoints.py", "api", None),
        ("test_rl_and_federated_endpoints.py", "api", None),
        
        # Tests de ML Models → tests/ml_models/
        ("test_ml_components.py", "ml_models", None),
        ("test_model_predictions.py", "ml_models", None),
        ("test_retraining_pipeline.py", "ml_models", None),
        ("test_retraining_system.py", "ml_models", None),
        ("test_advanced_ml_smoke.py", "ml_models", None),
        ("test_advanced_ml_edge_cases.py", "ml_models", None),
        
        # Tests de Servicios → tests/services/
        ("test_enhanced_chatbot.py", "services", None),
        
        # Tests de Performance → tests/performance/
        ("test_ensemble_performance.py", "performance", None),
        
        # Tests de Integración → tests/integration/
        ("test_additional_coverage.py", "integration", None),
    ]
    
    print("=" * 80)
    print("📁 ORGANIZANDO ESTRUCTURA DE TESTS")
    print("=" * 80)
    print()
    
    moved_count = 0
    skipped_count = 0
    error_count = 0
    
    for source_file, dest_folder, new_name in moves:
        source_path = base_path / source_file
        dest_dir = base_path / dest_folder
        dest_name = new_name if new_name else source_file
        dest_path = dest_dir / dest_name
        
        if not source_path.exists():
            print(f"⏭️  Saltado: {source_file} (no existe)")
            skipped_count += 1
            continue
        
        # Crear directorio destino si no existe
        dest_dir.mkdir(exist_ok=True)
        
        # Verificar si ya existe en el destino
        if dest_path.exists():
            print(f"⚠️  Ya existe: {dest_folder}/{dest_name} - Verificando si es duplicado...")
            # Comparar tamaños
            if source_path.stat().st_size == dest_path.stat().st_size:
                print(f"   → Parece ser duplicado, eliminando original")
                source_path.unlink()
                skipped_count += 1
                continue
            else:
                print(f"   → Archivos diferentes, renombrando original")
                dest_name = f"backup_{dest_name}"
                dest_path = dest_dir / dest_name
        
        try:
            # Mover archivo
            shutil.move(str(source_path), str(dest_path))
            print(f"✅ Movido: {source_file} → {dest_folder}/{dest_name}")
            moved_count += 1
        except Exception as e:
            print(f"❌ Error moviendo {source_file}: {e}")
            error_count += 1
    
    print()
    print("=" * 80)
    print("📊 RESUMEN")
    print("=" * 80)
    print(f"✅ Archivos movidos: {moved_count}")
    print(f"⏭️  Archivos saltados: {skipped_count}")
    print(f"❌ Errores: {error_count}")
    print()
    
    # Mostrar estructura final
    print("📋 Estructura organizada de tests:")
    print()
    print("tests/")
    print("├── __init__.py")
    print("├── conftest.py")
    print("├── api/                    # Tests de endpoints de API")
    print("├── core/                   # Tests de módulos core")
    print("├── services/               # Tests de servicios")
    print("├── ml_models/              # Tests de modelos ML")
    print("├── strategies/             # Tests de estrategias")
    print("├── decorators/             # Tests de decoradores")
    print("├── repositories/           # Tests de repositorios")
    print("├── factories/              # Tests de factories")
    print("├── circuit_breaker/        # Tests de circuit breakers")
    print("├── patterns/               # Tests de patrones")
    print("├── integration/            # Tests de integración")
    print("├── performance/            # Tests de performance")
    print("├── security/               # Tests de seguridad")
    print("└── utils/                  # Tests de utilidades")
    print()
    print("=" * 80)

if __name__ == "__main__":
    organize_tests()

