#!/usr/bin/env bash
# Generate self-signed SSL certificate for local development
# For production: replace with a CA-signed certificate from your school's IT team

set -euo pipefail

SSL_DIR="$(dirname "$0")/../nginx/ssl"
mkdir -p "$SSL_DIR"

echo "Generating self-signed SSL certificate..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/key.pem" \
  -out "$SSL_DIR/cert.pem" \
  -subj "/C=DE/ST=Local/L=Local/O=SchoolCronicle/CN=localhost"

echo "✓ Certificate generated at nginx/ssl/cert.pem"
echo "  Add nginx/ssl/ to your browser's trusted certificates for local HTTPS"
