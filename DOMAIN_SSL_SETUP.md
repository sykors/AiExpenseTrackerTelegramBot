# Domain & SSL Setup - Ghid Complet

## Cum Funcționează Domeniul și SSL-ul

### 📍 Unde se pune domenul?

Domenul se configurează în **un singur loc**: fișierul `.env`

```env
DOMAIN=example.com
SSL_EMAIL=your-email@gmail.com
WEB_DOMAIN=example.com        # sau un subdomeniu separat pentru UI
```

### 🔄 Cum funcționează fluxul complet?

```
User Request → Domain (DNS) → Server IP → Nginx (Port 443) → FastAPI/Next.js
             https://example.com                SSL/HTTPS         Your App
```

---

## Configurare Pas cu Pas

### 1. Configurare DNS (la provider domeniu)

**La provider-ul de domeniu** (GoDaddy, Namecheap, Cloudflare, etc.):

```
Type: A
Name: @      (sau api dacă vrei subdomeniu)
Value: 123.45.67.89 (IP-ul serverului tău)
TTL: 3600
```

**Exemplu**:
- Vrei scenariul simplu → `example.com`
- DNS Record:
  - Type: `A`
  - Name: `@`
  - Value: `123.45.67.89`

**Așteaptă 5-10 minute** pentru propagare DNS.

**Verificare DNS**:
```bash
# Pe computerul tău
ping example.com
# Trebuie să returneze IP-ul serverului
```

---

### 2. Configurare .env pe Server

```bash
# Pe server
cd TelegramBotAI
nano .env
```

**Adaugă/modifică**:
```env
# Server Configuration
DOMAIN=example.com              # Domeniul tău exact!
SERVER_IP=123.45.67.89           # IP-ul serverului
SSL_EMAIL=your-email@gmail.com   # Email pentru Let's Encrypt

# Restul configurațiilor
GROQAPIKEY=your-key
telegramToken=your-token
# ... etc
```

---

### 3. Cum se folosește DOMAIN în sistem?

#### A. Nginx (`nginx/start-nginx.sh`) folosește DOMAIN pentru:
- **Virtual host**: știe pe ce domeniu să răspundă.
- **SSL**: încarcă certificatele emise de Let's Encrypt pentru acel domeniu.
- **Routing**: direcționează `/api/*` către FastAPI și restul către Next.js (dacă folosești un singur domeniu). Dacă `WEB_DOMAIN` este diferit, scriptul generează două server blocks separate.

Fragment din config-ul generat automat (scenariul „totul pe același domeniu”):
```nginx
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    location ^~ /api/ {
        proxy_pass http://app:8000$request_uri;
    }

    location / {
        proxy_pass http://web:3000;
    }
}
```

#### B. SSL Setup Script folosește DOMAIN pentru:
- **Certbot**: Generează certificat pentru domeniul specificat
- **Validation**: Verifică că domeniul este accesibil

**Setup SSL** (`setup-ssl.sh`):
```bash
certbot certonly \
    --webroot \
    -d $DOMAIN \           # ← Domeniul tău
    -d www.$DOMAIN \       # ← Cu www
    --email $SSL_EMAIL
```

---

## Flow Complet

### 1. User accesează API-ul
```
User browser → https://example.com/api/v1/expenses
```

### 2. DNS Resolution
```
example.com → 123.45.67.89 (server IP)
```

### 3. Nginx primește request-ul
```
Port 443 (HTTPS) → containerul Nginx
- Verifică certificatul pentru example.com
- Decryptează conexiunea SSL
- Trimite /api/* către FastAPI și restul către Next.js
```

### 4. FastAPI procesează request-ul
```
Nginx → Port 8000 → FastAPI Container → Database/Redis
```

### 5. Response înapoi la User
```
FastAPI → Nginx → SSL encrypt → User
```

---

## Comenzi pentru Setup Complet

### Setup Inițial (pe server)
```bash
# 1. Clonează repo
git clone https://github.com/your-username/TelegramBotAI.git
cd TelegramBotAI

# 2. Configurează .env
cp .env.example .env
nano .env
# Editează: DOMAIN, SSL_EMAIL, API keys, etc.

# 3. Setup SSL (automat!)
make setup-ssl

# 4. Start production
make prod
```

### Verificare
```bash
# Check DNS
ping example.com

# Check SSL certificate
make ssl-check

# Check API health
curl https://example.com/health
```

---

## Structura Fișierelor

```
TelegramBotAI/
├── .env                      # ← DOMAIN se configurează aici!
│   └── DOMAIN=example.com
│
├── docker-compose.prod.yml   # ← Nginx folosește ${DOMAIN} din .env
│   └── nginx service
│       └── environment:
│           └── DOMAIN=${DOMAIN}
│
├── nginx/
│   ├── start-nginx.sh        # ← Generează config în funcție de DOMAIN / WEB_DOMAIN
│   ├── ssl/                  # ← Certificatele SSL (auto-generate)
│   └── certbot-www/          # ← Let's Encrypt validation
│
└── setup-ssl.sh              # ← Script automat SSL
```

---

## Exemple Concrete

### Exemplu 1: Un singur domeniu
```env
# .env
DOMAIN=mycompany.com
SSL_EMAIL=admin@mycompany.com
WEB_DOMAIN=mycompany.com
```

**Rezultat**:
- API disponibil la: `https://mycompany.com/api`
- UI la: `https://mycompany.com`
- SSL valid pentru: `mycompany.com` și `www.mycompany.com`

### Exemplu 2: Domenii separate (API + Web)
```env
# .env
DOMAIN=api.mycompany.com
WEB_DOMAIN=app.mycompany.com
SSL_EMAIL=admin@mycompany.com
```

**Rezultat**:
- API la: `https://api.mycompany.com`
- UI la: `https://app.mycompany.com`
- SSL pentru fiecare domeniu specific

### Exemplu 3: Subdomain
```env
# .env
DOMAIN=bot.api.mycompany.com
SSL_EMAIL=admin@mycompany.com
```

**Rezultat**:
- API la: `https://bot.api.mycompany.com`

---

## Troubleshooting

### ❌ SSL Certificate Failed

**Cauze**:
1. DNS nu este configurat corect
2. Domeniul nu pointează către server
3. Portul 80/443 nu este deschis

**Fix**:
```bash
# Verifică DNS (înlocuiește cu domeniul tău)
dig example.com
nslookup example.com

# Verifică port 80
curl http://example.com

# Verifică firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Re-run SSL setup
make setup-ssl
```

### ❌ Domain nu funcționează

**Verificare**:
```bash
# 1. Check .env
cat .env | grep DOMAIN

# 2. Check DNS
ping $(cat .env | grep DOMAIN | cut -d'=' -f2)

# 3. Check Nginx config
docker-compose -f docker-compose.prod.yml exec nginx env | grep DOMAIN

# 4. Check logs
docker-compose -f docker-compose.prod.yml logs nginx
```

### ❌ SSL Expired

**Auto-renewal** este configurat, dar pentru manual:
```bash
make ssl-renew
```

---

## Multiple Domains

### Setup pentru mai multe domenii:

```env
# .env
DOMAIN=api.example.com,bot.example.com,app.example.com
```

Modifică `setup-ssl.sh`:
```bash
certbot certonly \
    -d api.example.com \
    -d bot.example.com \
    -d app.example.com \
    --email $SSL_EMAIL
```

---

## Security Best Practices

### ✅ Checklist
- [ ] DNS configurat corect
- [ ] SSL certificate renewed în ultimele 90 de zile (`make ssl-renew`)
- [ ] Force HTTPS (redirect HTTP → HTTPS)
- [ ] Security headers în Nginx
- [ ] Rate limiting activat
- [ ] Firewall configurat (doar 80, 443, 22)
- [ ] Strong passwords în .env
- [ ] .env nu e în git (.gitignore)

---

## Quick Reference

### Configurare Domain
```env
DOMAIN=example.com              # La provider DNS → A record → Server IP
SSL_EMAIL=your-email@gmail.com  # Pentru Let's Encrypt notifications
```

### Setup Complet
```bash
make setup-ssl  # Generează SSL automat
make prod       # Start production cu SSL
```

### Verificare
```bash
curl https://example.com/health      # Test HTTPS
make ssl-check                        # Check certificate
```

### Renewal
```bash
# Auto-renewal (fără acțiune)
# Container certbot face renew automat la 12h

# Manual
make ssl-renew
```

---

## Rezumat

### Unde se configurează domeniul?
**Un singur loc**: `.env` file
```env
DOMAIN=example.com
WEB_DOMAIN=example.com
```

### Cum funcționează?
1. **DNS** pointează domain → server IP
2. **Nginx** primește trafic pe port 443 (HTTPS)
3. **SSL** decryptează conexiunea
4. **FastAPI** procesează request-ul
5. **Response** înapoi prin SSL

### Comenzi esențiale:
```bash
make setup-ssl  # Setup SSL automat
make prod       # Start production
make ssl-check  # Verify SSL
```

**Gata! Domain-ul tău funcționează cu SSL automat! 🔒✨**
