"""
Scripts de entrenamiento de modelos ML
"""

import sys
from pathlib import Path

# Agregar raíz del proyecto al path para imports
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

