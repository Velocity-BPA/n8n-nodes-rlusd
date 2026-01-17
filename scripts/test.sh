#!/bin/bash
set -e

echo "🧪 Running n8n-nodes-rlusd tests..."

# Run linting
echo "🔍 Running ESLint..."
npm run lint || echo "⚠️ Linting issues found (non-blocking)"

# Run unit tests
echo "🔬 Running unit tests..."
npm test

# Run build to verify compilation
echo "🏗️ Verifying build..."
npm run build

echo "✅ All tests passed!"
