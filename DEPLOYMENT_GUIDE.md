# Deployment Guide - Expense Bot AI

## Deployment pe Server - 3 Pași Simpli

### Pregătire (o singură dată)

#### 1. Configurează DNS
Setează DNS-ul domeniului tău să arate către IP-ul serverului:
```
Type: A Record
Name: api (sau @ pentru domain root)
Value: IP_SERVER_TĂU
TTL: 3600
```

**Exemplu**:
- Domeniu: `api.example.com`
- IP Server: `123.45.67.89`

Așteaptă 5-10 minute pentru propagarea DNS.

#### 2. Verifică DNS
```bash
# Pe computerul tău
ping api.example.com

# Trebuie să returneze IP-ul serverului
```

---

## Deployment Rapid (3 Pași)

### Pas 1: Clonează Repo pe Server

```bash
# Conectează-te la server
ssh user@123.45.67.89

# Clonează repository
git clone https://github.com/your-username/TelegramBotAI.git
cd TelegramBotAI
```

---

### Pas 2: Configurează .env

```bash
# Copiază template
cp .env.example .env

# Editează .env
nano .env
```

**Completează următoarele**:
```env
# AI Service
GROQAPIKEY=gsk_your_actual_groq_key_here

# Telegram Bot
telegramToken=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ

# Database (schimbă password-urile!)
DATABASE_URL=postgresql://expenseuser:STRONG_PASSWORD_HERE@db:5432/expensebot
DB_USER=expenseuser
DB_PASSWORD=STRONG_PASSWORD_HERE
DB_NAME=expensebot

# Redis
REDIS_URL=redis://redis:6379

# Encryption (generează random: openssl rand -hex 32)
ENCRYPTION_KEY=your_32_byte_hex_key_here
JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# IMPORTANT: Domeniile tale!
DOMAIN=api.example.com
WEB_DOMAIN=app.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
API_BASE_URL=http://app:8000
SERVER_IP=123.45.67.89
SSL_EMAIL=your-email@example.com

# Application
APP_PORT=8000
LOG_LEVEL=info
```

**Salvează**: `Ctrl+O`, Enter, `Ctrl+X`

---

### Pas 3: Deploy & SSL Automat

```bash
# Instalează Docker (dacă nu e deja)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Instalează Docker Compose (dacă nu e deja)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Setup SSL (automat!)
./setup-ssl.sh

# Start production
docker-compose -f docker-compose.prod.yml up -d
```

**Gata! API-ul rulează pe**: `https://api.example.com`

---

## Verificare

### Check Status
```bash
# Status containere
docker-compose -f docker-compose.prod.yml ps

# Trebuie să vezi toate serviciile UP:
# - nginx (reverse proxy)
# - certbot (pentru renew)
# - web (Next.js)
# - app (FastAPI)
# - db (PostgreSQL)
# - redis
```

### Check Health
```bash
# Local pe server
curl http://localhost:8000/health

# Public cu SSL
curl https://api.example.com/health

# Expected response:
# {"status":"healthy"}
```

### Check Logs
```bash
# Toate serviciile
docker-compose -f docker-compose.prod.yml logs -f

# Doar app
docker-compose -f docker-compose.prod.yml logs -f app

# Doar nginx
docker-compose -f docker-compose.prod.yml logs -f nginx
```

---

## Endpoints Disponibile

### Public URLs
- **Web UI**: `https://app.example.com/`
- **API Root**: `https://api.example.com/`
- **Health Check**: `https://api.example.com/health`
- **API Docs**: `https://api.example.com/docs`
- **ReDoc**: `https://api.example.com/redoc`

### API Routes
- `POST /api/v1/expenses/photo` - Upload receipt photo
- `POST /api/v1/expenses/voice` - Upload voice message
- `POST /api/v1/expenses/manual` - Submit text expense
- `GET /api/v1/expenses` - List expenses
- `POST /api/v1/categories` - Create category
- `GET /api/v1/categories` - List categories

---

## Configurare Firewall

### Ubuntu/Debian (UFW)
```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

### CentOS/RHEL (Firewalld)
```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## Management

### Start/Stop/Restart
```bash
# Start
docker-compose -f docker-compose.prod.yml up -d

# Stop
docker-compose -f docker-compose.prod.yml down

# Restart
docker-compose -f docker-compose.prod.yml restart

# Restart doar app
docker-compose -f docker-compose.prod.yml restart app
```

### Update Code
```bash
# Pull latest code
git pull origin main

# Rebuild și restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup Database
```bash
# Manual backup
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U expenseuser expensebot > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker-compose -f docker-compose.prod.yml exec -T db psql -U expenseuser expensebot < backup_file.sql
```

### View Logs
```bash
# Live logs
docker-compose -f docker-compose.prod.yml logs -f

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100

# Specific service
docker-compose -f docker-compose.prod.yml logs -f app
```

---

## SSL Certificate

### Auto-Renewal
Certificatul SSL se reînnoiește automat (certbot container).

### Manual Renewal
```bash
docker-compose -f docker-compose.prod.yml exec certbot certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
```

### Check Certificate Expiration
```bash
echo | openssl s_client -servername api.example.com -connect api.example.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Troubleshooting

### Problema: SSL Certificate Failed
```bash
# Check DNS
dig api.example.com

# Verify port 80 is open
curl http://api.example.com/.well-known/acme-challenge/test

# Re-run SSL setup
./setup-ssl.sh
```

### Problema: Container Failed to Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Check environment
docker-compose -f docker-compose.prod.yml exec app env

# Rebuild
docker-compose -f docker-compose.prod.yml up -d --build
```

### Problema: Database Connection Error
```bash
# Check DB status
docker-compose -f docker-compose.prod.yml exec db pg_isready -U expenseuser

# Check connection from app
docker-compose -f docker-compose.prod.yml exec app psql $DATABASE_URL -c "SELECT 1"
```

### Problema: Out of Memory
```bash
# Check resources
docker stats

# Adjust in docker-compose.prod.yml:
deploy:
  resources:
    limits:
      memory: 4G  # Increase if needed
```

---

## Monitoring

### Resource Usage
```bash
# Real-time stats
docker stats

# Disk usage
docker system df

# Volume sizes
docker volume ls
```

### Health Monitoring Script
```bash
#!/bin/bash
# save as monitor.sh

while true; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
    if [ $STATUS -eq 200 ]; then
        echo "$(date): OK"
    else
        echo "$(date): FAILED - Status $STATUS"
        # Send alert (email, telegram, etc.)
    fi
    sleep 60
done
```

---

## Security Checklist

- [x] SSL/HTTPS enabled
- [x] Strong database passwords
- [x] Non-root user în container
- [x] Firewall configured
- [x] Rate limiting enabled (Nginx)
- [x] Security headers set
- [ ] Regular backups scheduled
- [ ] Monitoring alerts configured
- [ ] Log rotation configured
- [ ] SSH key-based auth only

---

## Performance Tuning

### Gunicorn Workers
Ajustează în `Dockerfile` line 147:
```dockerfile
"--workers", "4",  # Change based on CPU: (2 * CPU_CORES) + 1
```

### Database Connection Pool
În `app/database.py`:
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=20,        # Adjust based on traffic
    max_overflow=40
)
```

### Redis Cache
Folosește Redis pentru session storage și caching.

---

## Quick Reference

### One-Line Commands
```bash
# Status
docker-compose -f docker-compose.prod.yml ps

# Logs
docker-compose -f docker-compose.prod.yml logs -f app

# Restart
docker-compose -f docker-compose.prod.yml restart app

# Shell access
docker-compose -f docker-compose.prod.yml exec app bash

# DB shell
docker-compose -f docker-compose.prod.yml exec db psql -U expenseuser expensebot

# Redis CLI
docker-compose -f docker-compose.prod.yml exec redis redis-cli

# Health check
curl https://api.example.com/health
```

---

## Support

**Issues**: Create an issue in the GitHub repository

**Documentation**:
- [DOCKER_USAGE.md](DOCKER_USAGE.md) - Docker details
- [QUICK_START.md](QUICK_START.md) - Development guide
- [CLAUDE.md](CLAUDE.md) - Project overview

---

## Summary

**Setup pe server = 3 comenzi**:
```bash
1. git clone <repo> && cd TelegramBotAI
2. cp .env.example .env && nano .env  # Edit cu date reale
3. ./setup-ssl.sh && docker-compose -f docker-compose.prod.yml up -d
```

**Verificare**:
```bash
curl https://api.example.com/health
```

**Gata! API-ul rulează cu SSL automat pe domeniul tău! 🚀**
