#!/usr/bin/env bash
# Generate RS256 JWT key pair for SchoolCronicle
# Run once and add output to your .env / .env.dev

set -euo pipefail

KEYS_DIR="$(dirname "$0")/../.keys"
mkdir -p "$KEYS_DIR"

echo "Generating RS256 JWT key pair..."

openssl genrsa -out "$KEYS_DIR/jwt-private.pem" 4096
openssl rsa -in "$KEYS_DIR/jwt-private.pem" -pubout -out "$KEYS_DIR/jwt-public.pem"

echo ""
echo "✓ Keys generated:"
echo "  Private key: .keys/jwt-private.pem"
echo "  Public key:  .keys/jwt-public.pem"
echo ""
echo "Add to your .env.dev:"
echo "JWT_PRIVATE_KEY=\"\$(cat .keys/jwt-private.pem)\""
echo "JWT_PUBLIC_KEY=\"\$(cat .keys/jwt-public.pem)\""
echo ""
echo "⚠ NEVER commit the .keys/ directory to version control"
