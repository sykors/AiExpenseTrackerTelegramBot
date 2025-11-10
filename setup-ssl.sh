#!/bin/bash

# ========================================
# SSL Setup Script with Let's Encrypt
# ========================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "  SSL Setup for Expense Bot AI"
echo "========================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create .env file with DOMAIN and SSL_EMAIL variables"
    exit 1
fi

# Check required variables
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: DOMAIN not set in .env${NC}"
    exit 1
fi

if [ -z "$SSL_EMAIL" ]; then
    echo -e "${RED}Error: SSL_EMAIL not set in .env${NC}"
    exit 1
fi

if [ -z "$WEB_DOMAIN" ]; then
    echo -e "${RED}Error: WEB_DOMAIN not set in .env${NC}"
    echo "Set WEB_DOMAIN to the hostname that will serve the Next.js UI (e.g., app.example.com)"
    exit 1
fi

if [ "$WEB_DOMAIN" = "$DOMAIN" ]; then
    echo -e "${RED}Error: WEB_DOMAIN must be different from DOMAIN${NC}"
    echo "Use two hostnames, e.g. DOMAIN=api.example.com and WEB_DOMAIN=app.example.com"
    exit 1
fi

if [ ! -f nginx/nginx.conf.template ]; then
    echo -e "${RED}Error: nginx/nginx.conf.template is missing${NC}"
    echo "Please make sure you pulled the latest repository version."
    exit 1
fi

echo -e "${GREEN}Domain: $DOMAIN${NC}"
echo -e "${GREEN}Web Domain: $WEB_DOMAIN${NC}"
echo -e "${GREEN}Email: $SSL_EMAIL${NC}"
echo ""

# Create necessary directories
echo "Creating SSL directories..."
mkdir -p nginx/ssl
mkdir -p nginx/certbot-www
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Check if certificates already exist
if [ -d "nginx/ssl/live/$DOMAIN" ]; then
    echo -e "${YELLOW}⚠ SSL certificates already exist for $DOMAIN${NC}"
    read -p "Do you want to renew them? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping SSL setup"
        exit 0
    fi
fi

# Create temporary nginx config for certificate generation
echo "Creating temporary Nginx config..."
cat > nginx/nginx-certbot.conf << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80 default_server;
        server_name _;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
EOF
echo -e "${GREEN}✓ Temporary config created${NC}"
echo ""

# Start temporary nginx for certificate generation
echo "Starting temporary Nginx..."
docker run -d \
    --name temp-nginx-certbot \
    -p 80:80 \
    -v $(pwd)/nginx/nginx-certbot.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/nginx/certbot-www:/var/www/certbot \
    nginx:alpine

sleep 2
echo -e "${GREEN}✓ Nginx started${NC}"
echo ""

# Generate SSL certificate
CERTBOT_DOMAINS=$(python3 - <<'PY'
import os
domains = []
raw = os.environ["DOMAIN"].strip()
domains.extend([raw, f"www.{raw}"])
web = os.environ.get("WEB_DOMAIN", "").strip()
if web and web != raw:
    domains.extend([web, f"www.{web}"])
seen = []
for host in domains:
    if host and host not in seen:
        seen.append(host)
print(" ".join(f"-d {host}" for host in seen))
PY
)

echo "Requesting SSL certificate from Let's Encrypt..."
echo "Domains: $CERTBOT_DOMAINS"
echo "This may take a few minutes..."
echo ""

docker run --rm \
    -v $(pwd)/nginx/ssl:/etc/letsencrypt \
    -v $(pwd)/nginx/certbot-www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $SSL_EMAIL \
    --agree-tos \
    --no-eff-email \
    $CERTBOT_DOMAINS

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ SSL certificate generated successfully!${NC}"
else
    echo ""
    echo -e "${RED}✗ Failed to generate SSL certificate${NC}"
    echo "Please check:"
    echo "  1. Domain DNS is pointing to this server"
    echo "  2. Ports 80 and 443 are open"
    echo "  3. Domain is accessible from the internet"
    docker stop temp-nginx-certbot
    docker rm temp-nginx-certbot
    exit 1
fi

# Stop temporary nginx
echo ""
echo "Stopping temporary Nginx..."
docker stop temp-nginx-certbot
docker rm temp-nginx-certbot
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo "========================================="
echo -e "${GREEN}SSL Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Your SSL certificates are valid for 90 days."
echo "Use 'make ssl-renew' (or schedule it via cron) to renew them before expiry."
echo ""
echo "Next steps:"
echo "  1. Start production: docker-compose -f docker-compose.prod.yml up -d"
echo "  2. Check status: docker-compose -f docker-compose.prod.yml ps"
echo "  3. View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Your API will be available at:"
echo "  https://$DOMAIN"
echo "Your Web UI will be available at:"
echo "  https://$WEB_DOMAIN"
echo ""
