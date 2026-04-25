"""
MutPy Mutation Testing Configuration

MutPy is a mutation testing tool for Python that mutates your code
and runs your tests to verify that your tests are good enough to catch bugs.

Documentation: https://github.com/mutpy/mutpy
"""

# Configuration for MutPy mutation testing
MUTATION_CONFIG = {
    # Target modules to mutate
    'target': [
        'api',
        'core',
        'services',
        'ml_models',
    ],
    
    # Unit tests to run
    'unit_test': [
        'tests',
    ],
    
    # Mutation operators to use
    'operators': [
        'AOR',  # Arithmetic Operator Replacement
        'AOD',  # Arithmetic Operator Deletion
        'COD',  # Conditional Operator Deletion
        'COI',  # Conditional Operator Insertion
        'CRP',  # Constant Replacement
        'LCR',  # Logical Connector Replacement
        'ROR',  # Relational Operator Replacement
        'ASR',  # Assignment Operator Replacement
        'SDL',  # Statement Deletion
        'SIR',  # Statement Insertion
    ],
    
    # Number of processes to use (0 = auto-detect)
    'processes': 2,
    
    # Timeout for each test (in seconds)
    'timeout': 10,
    
    # Show progress
    'show_progress': True,
    
    # Coverage analysis
    'coverage': True,
    
    # Exclude patterns
    'exclude': [
        '__pycache__',
        '*.pyc',
        'venv',
        '.venv',
        'migrations',
        'models',
        'node_modules',
        'tests',
        'conftest.py',
        '__init__.py',
    ],
    
    # Include patterns
    'include': [
        '*.py',
    ],
    
    # Mutation score threshold (0-100)
    'threshold': 70,
    
    # Report format
    'report': 'html',  # Options: 'html', 'text', 'json'
    
    # Output directory
    'output_dir': 'mutation-reports',
    
    # Verbose output
    'verbose': True,
    
    # Stop on first failure
    'stop_on_first_failure': False,
    
    # Random seed for reproducibility
    'random_seed': None,
}

# Mutation operators detailed configuration
MUTATION_OPERATORS = {
    # Arithmetic Operator Replacement
    # + -> -, *, /, %, **
    # - -> +, *, /, %, **
    # etc.
    'AOR': {
        'enabled': True,
        'replacements': {
            '+': ['-', '*', '/', '%', '**'],
            '-': ['+', '*', '/', '%', '**'],
            '*': ['+', '-', '/', '%', '**'],
            '/': ['+', '-', '*', '%', '**'],
            '%': ['+', '-', '*', '/', '**'],
            '**': ['+', '-', '*', '/', '%'],
        },
    },
    
    # Conditional Operator Replacement
    'ROR': {
        'enabled': True,
        'replacements': {
            '<': ['<=', '>', '>=', '==', '!='],
            '<=': ['<', '>', '>=', '==', '!='],
            '>': ['>=', '<', '<=', '==', '!='],
            '>=': ['>', '<', '<=', '==', '!='],
            '==': ['!=', '<', '<=', '>', '>='],
            '!=': ['==', '<', '<=', '>', '>='],
        },
    },
    
    # Logical Connector Replacement
    'LCR': {
        'enabled': True,
        'replacements': {
            'and': ['or'],
            'or': ['and'],
        },
    },
    
    # Constant Replacement
    'CRP': {
        'enabled': True,
        'replacements': {
            '0': ['1', '-1'],
            '1': ['0', '2', '-1'],
            '-1': ['0', '1', '2'],
            'True': ['False'],
            'False': ['True'],
            'None': ['0', '""', '[]', '{}'],
        },
    },
    
    # Statement Deletion
    'SDL': {
        'enabled': True,
        'max_deletions': 1,  # Delete at most 1 statement per function
    },
    
    # Statement Insertion
    'SIR': {
        'enabled': True,
        'max_insertions': 1,  # Insert at most 1 statement per function
    },
}

# Files and directories to exclude from mutation
EXCLUDE_PATTERNS = [
    '*/__pycache__/*',
    '*/venv/*',
    '*/.venv/*',
    '*/migrations/*',
    '*/models/*',
    '*/node_modules/*',
    '*/tests/*',
    '*/test_*.py',
    '*_test.py',
    'conftest.py',
    '__init__.py',
    'setup.py',
    'manage.py',
]

# Files and directories to include in mutation
INCLUDE_PATTERNS = [
    'api/**/*.py',
    'core/**/*.py',
    'services/**/*.py',
    'ml_models/**/*.py',
]

# Test configuration
TEST_CONFIG = {
    # Test discovery pattern
    'test_pattern': 'test_*.py',
    
    # Test directory
    'test_dir': 'tests',
    
    # Pytest configuration file
    'pytest_config': 'pytest.ini',
    
    # Coverage configuration
    'coverage': {
        'enabled': True,
        'source': [
            'api',
            'core',
            'services',
            'ml_models',
        ],
        'omit': [
            '*/tests/*',
            '*/venv/*',
            '*/__pycache__/*',
        ],
    },
}

# Report configuration
REPORT_CONFIG = {
    # Output formats
    'formats': ['html', 'text'],
    
    # HTML report options
    'html': {
        'output_dir': 'mutation-reports/html',
        'template': 'default',
        'show_source': True,
        'show_mutations': True,
    },
    
    # Text report options
    'text': {
        'output_file': 'mutation-reports/mutation-report.txt',
        'show_details': True,
    },
    
    # JSON report options
    'json': {
        'output_file': 'mutation-reports/mutation-report.json',
        'pretty': True,
    },
}

# Performance configuration
PERFORMANCE_CONFIG = {
    # Maximum number of mutations to generate
    'max_mutations': 1000,
    
    # Maximum time to run (in seconds)
    'max_time': 3600,  # 1 hour
    
    # Parallel execution
    'parallel': True,
    'processes': 2,
    
    # Timeout per test (in seconds)
    'test_timeout': 10,
}

# Quality thresholds
THRESHOLDS = {
    # Minimum mutation score (0-100)
    'min_score': 70,
    
    # High score threshold
    'high_score': 80,
    
    # Low score threshold
    'low_score': 60,
    
    # Fail build if below threshold
    'fail_below': False,  # Set to True to fail CI/CD on low score
}

