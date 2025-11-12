# Deploy Simplu pe Server - 3 Pași

## Înainte de Deploy

1. **Domeniu configurat**: `example.com` → IP server
2. **Porturi deschise**: 80, 443 (firewall/cloud provider)

---

## 3 Pași - Asta e Tot!

### 1️⃣ Clonează pe Server
```bash
ssh user@server-ip
git clone https://github.com/your-username/TelegramBotAI.git
cd TelegramBotAI
```

### 2️⃣ Configurează .env
```bash
cp .env.example .env
nano .env
```

Completează:
```env
GROQAPIKEY=your-groq-key
telegramToken=your-telegram-token
DOMAIN=example.com             # ⚠️ IMPORTANT!
WEB_DOMAIN=example.com         # Lasă identic dacă UI-ul e pe același domeniu
NEXT_PUBLIC_API_URL=https://example.com/api
API_BASE_URL=http://app:8000
SSL_EMAIL=your-email@gmail.com  # ⚠️ IMPORTANT!
ENCRYPTION_KEY=generate-random-32-chars
```

**Salvează**: `Ctrl+O`, Enter, `Ctrl+X`

### 3️⃣ Deploy Automat
```bash
# Instalează Docker (dacă nu e)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Setup SSL + Start
./setup-ssl.sh
docker-compose -f docker-compose.prod.yml up -d
```

---

## ✅ Verificare

```bash
# Status
docker-compose -f docker-compose.prod.yml ps

# Test API
curl https://example.com/health
```

**Expected**: `{"status":"healthy"}`

---

## 🎯 Access API

- **Health**: `https://example.com/health`
- **Docs**: `https://example.com/docs`
- **API**: `https://example.com/api/v1/...`

---

## 📝 Comenzi Utile

```bash
# Vezi logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart
docker-compose -f docker-compose.prod.yml restart

# Stop
docker-compose -f docker-compose.prod.yml down

# Update code
git pull && docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🔧 Troubleshooting

### SSL nu funcționează
```bash
# Verifică DNS
ping api.example.com

# Re-run SSL setup
./setup-ssl.sh
```

### Container nu pornește
```bash
# Vezi erori
docker-compose -f docker-compose.prod.yml logs app

# Rebuild
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 📚 Documentație Completă

Vezi [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) pentru detalii complete.

---

**Gata! API-ul tău rulează cu HTTPS pe domeniul tău! 🚀**
