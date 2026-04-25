#!/bin/bash

###############################################################################
# Code Generation Script - MDSD Automation
# Generates DTOs, Repositories, and validates models
###############################################################################

set -e  # Exit on error

echo "🚀 RespiCare - MDSD Code Generation"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section header
print_header() {
    echo -e "${BLUE}$1${NC}"
    echo "------------------------------------"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if TypeScript is installed
if ! command -v tsc &> /dev/null; then
    echo "❌ TypeScript is not installed. Installing..."
    npm install -g typescript
fi

# 1. Generate DTOs
print_header "1. Generating DTOs from Domain Entities"
npx ts-node src/generators/dto-generator.ts
print_success "DTOs generated"
echo ""

# 2. Generate Repositories
print_header "2. Generating Repositories from Domain Models"
npx ts-node src/generators/repository-generator.ts
print_success "Repositories generated"
echo ""

# 3. Validate TypeScript compilation
print_header "3. Validating TypeScript Compilation"
tsc --noEmit
print_success "TypeScript validation passed"
echo ""

# 4. Generate OpenAPI types (if openapi-typescript is installed)
if command -v openapi-typescript &> /dev/null; then
    print_header "4. Generating TypeScript types from OpenAPI"
    npx openapi-typescript openapi/respicare-api.yaml -o src/types/api.generated.ts
    print_success "OpenAPI types generated"
    echo ""
else
    print_warning "openapi-typescript not installed. Skipping OpenAPI generation."
    echo "Install with: npm install -g openapi-typescript"
    echo ""
fi

# 5. Generate PlantUML diagrams (if plantuml is available)
if command -v plantuml &> /dev/null; then
    print_header "5. Generating UML Diagrams"
    plantuml ../docs/diagrams/*.puml -o output
    print_success "UML diagrams generated"
    echo ""
else
    print_warning "PlantUML not installed. Skipping diagram generation."
    echo "Install from: https://plantuml.com/"
    echo ""
fi

# 6. Format generated code
print_header "6. Formatting Generated Code"
npx prettier --write "src/**/*.generated.ts"
print_success "Code formatted"
echo ""

# 7. Summary
echo "===================================="
echo -e "${GREEN}✅ Code Generation Complete!${NC}"
echo ""
echo "Generated files:"
echo "  • DTOs: src/interface-adapters/dtos/generated/"
echo "  • Repositories: src/infrastructure/repositories/generated/"
echo "  • OpenAPI types: src/types/api.generated.ts"
echo "  • UML diagrams: docs/diagrams/output/"
echo ""
echo "Next steps:"
echo "  1. Review generated code"
echo "  2. Run tests: npm test"
echo "  3. Commit changes: git add . && git commit -m 'chore: regenerate code from models'"
echo ""

