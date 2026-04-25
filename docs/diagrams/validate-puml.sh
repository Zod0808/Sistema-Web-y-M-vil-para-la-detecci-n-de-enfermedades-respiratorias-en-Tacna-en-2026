#!/bin/bash

# Script to validate PlantUML syntax
# This can be run locally or in CI

echo "🔍 Validating PlantUML files..."
echo ""

has_errors=0

for file in *.puml; do
    if [ ! -f "$file" ]; then
        continue
    fi
    
    echo "Checking $file..."
    
    # Check for @startuml
    if ! grep -q "@startuml" "$file"; then
        echo "  ❌ Missing @startuml tag"
        has_errors=1
    fi
    
    # Check for @enduml
    if ! grep -q "@enduml" "$file"; then
        echo "  ❌ Missing @enduml tag"
        has_errors=1
    fi
    
    # Check for balanced braces
    open_braces=$(grep -o "{" "$file" | wc -l)
    close_braces=$(grep -o "}" "$file" | wc -l)
    
    if [ "$open_braces" -ne "$close_braces" ]; then
        echo "  ⚠️  Unbalanced braces: $open_braces open, $close_braces close"
    fi
    
    # Count lines
    lines=$(wc -l < "$file")
    echo "  ℹ️  Lines: $lines"
    
    echo "  ✅ Basic validation passed"
    echo ""
done

if [ $has_errors -eq 0 ]; then
    echo "✅ All PlantUML files validated successfully!"
    exit 0
else
    echo "❌ Some files have validation errors"
    exit 1
fi

