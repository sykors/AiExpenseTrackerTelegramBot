#!/bin/sh
set -e

if [ -z "$DOMAIN" ]; then
    echo "[nginx] Error: DOMAIN environment variable is not set" >&2
    exit 1
fi

FASTAPI_UPSTREAM="app:8000"
WEB_UPSTREAM="web:3000"
ACTUAL_WEB_DOMAIN="${WEB_DOMAIN:-$DOMAIN}"
INCLUDE_WWW_VARIANTS="${INCLUDE_WWW_VARIANTS:-true}"

should_include_www() {
    case "$(printf "%s" "$INCLUDE_WWW_VARIANTS" | tr '[:upper:]' '[:lower:]')" in
        ""|"true"|"1"|"yes"|"on")
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

build_server_names() {
    local base="$1"
    if should_include_www; then
        printf "%s www.%s" "$base" "$base"
    else
        printf "%s" "$base"
    fi
}

API_SERVER_NAMES="$(build_server_names "$DOMAIN")"
WEB_SERVER_NAMES="$(build_server_names "$ACTUAL_WEB_DOMAIN")"

generate_single_domain() {
    cat <<EOF
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;

    map \$http_upgrade \$connection_upgrade {
        default upgrade;
        '' close;
    }

    upstream fastapi_backend {
        server ${FASTAPI_UPSTREAM};
    }

    upstream web_frontend {
        server ${WEB_UPSTREAM};
    }

    server {
        listen 80;
        listen [::]:80;
        server_name ${API_SERVER_NAMES};

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://\$host\$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name ${API_SERVER_NAMES};

        ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # FastAPI (served under /api and /auth paths)
        location ^~ /api/ {
            client_max_body_size 10M;
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://fastapi_backend\$request_uri;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        location ^~ /auth/ {
            limit_req zone=api_limit burst=5 nodelay;
            proxy_pass http://fastapi_backend\$request_uri;
        }

        location = /health {
            proxy_pass http://fastapi_backend/health;
        }

        location = /docs {
            proxy_pass http://fastapi_backend/docs;
        }

        location = /redoc {
            proxy_pass http://fastapi_backend/redoc;
        }

        location = /openapi.json {
            proxy_pass http://fastapi_backend/openapi.json;
        }

        # Everything else: Next.js frontend
        location / {
            proxy_pass http://web_frontend;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection \$connection_upgrade;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
EOF
}

generate_split_domain() {
    cat <<EOF
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;

    upstream fastapi_backend {
        server ${FASTAPI_UPSTREAM};
    }

    upstream web_frontend {
        server ${WEB_UPSTREAM};
    }

    map \$http_upgrade \$connection_upgrade {
        default upgrade;
        '' close;
    }

    server {
        listen 80;
        listen [::]:80;
        server_name ${API_SERVER_NAMES};

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://\$host\$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name ${DOMAIN} www.${DOMAIN};

        ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        location /health {
            proxy_pass http://fastapi_backend/health;
        }

        location /api/ {
            client_max_body_size 10M;
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://fastapi_backend;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        location /auth/ {
            limit_req zone=api_limit burst=5 nodelay;
            proxy_pass http://fastapi_backend;
        }

        location /docs {
            proxy_pass http://fastapi_backend;
        }

        location /redoc {
            proxy_pass http://fastapi_backend;
        }

        location /openapi.json {
            proxy_pass http://fastapi_backend;
        }

        location / {
            proxy_pass http://fastapi_backend;
        }
    }

    server {
        listen 80;
        listen [::]:80;
        server_name ${WEB_SERVER_NAMES};

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://\$host\$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name ${WEB_SERVER_NAMES};

        ssl_certificate /etc/letsencrypt/live/${ACTUAL_WEB_DOMAIN}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/${ACTUAL_WEB_DOMAIN}/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;

        location / {
            proxy_pass http://web_frontend;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
EOF
}

if [ "$ACTUAL_WEB_DOMAIN" = "$DOMAIN" ]; then
    generate_single_domain > /etc/nginx/nginx.conf
else
    generate_split_domain > /etc/nginx/nginx.conf
fi

exec nginx -g 'daemon off;'
