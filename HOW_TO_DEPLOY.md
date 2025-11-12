# 🚀 Cum să Deployezi Expense Bot AI (Backend + Web UI)

## 📦 Ce Include Deployment-ul

Scriptul `deploy_server.sh` deployează **complet automat**:

### ✅ Backend (FastAPI)
- API REST complet
- PostgreSQL database
- Redis cache
- Groq AI integration
- Telegram bot support

### ✅ Web UI (Next.js)
- **Interfață grafică modernă** din folder-ul `expense-web/`
- Dashboard cu cheltuieli
- Upload bonuri fiscal
- Statistici și grafice
- Responsive design

### ✅ Infrastructure
- Docker & Docker Compose
- Nginx reverse proxy
- Firewall configuration
- Health checks

---

## 🎯 URL-uri După Deployment

După ce scriptul se finalizează, vei avea acces la:

### 🌐 **Web UI (Interfața Grafică)**
```
http://65.21.110.105        ← Acces principal (prin Nginx)
http://65.21.110.105:3000   ← Acces direct la Next.js
```

### 🔌 **API Backend**
```
http://65.21.110.105:8000   ← API direct
http://65.21.110.105/api/   ← API prin Nginx
```

### 📚 **Documentație API**
```
http://65.21.110.105/docs   ← Swagger UI interactiv
```

### ❤️ **Health Check**
```
http://65.21.110.105/health ← Verifică status
```

---

## 📋 Pași de Deployment

### 1️⃣ Transferă Scriptul pe Server

**Pe calculatorul tău local:**
```bash
scp deploy_server.sh root@65.21.110.105:/root/
```
Parolă: `XukPiipRCaff`

---

### 2️⃣ Conectează-te la Server

```bash
ssh root@65.21.110.105
```
Parolă: `XukPiipRCaff`

---

### 3️⃣ Rulează Scriptul

```bash
chmod +x /root/deploy_server.sh
/root/deploy_server.sh
```

---

## 🔑 Informații Necesare

Scriptul te va întreba următoarele. **Pregătește-le dinainte:**

### 1. **GitHub Username**
```
Exemplu: andreim-dev
```

### 2. **GitHub Email**
```
Exemplu: andrei@example.com
```

### 3. **GitHub Repository URL**
```
Format SSH: git@github.com:username/TelegramBotAI.git

⚠️ IMPORTANT: Repository-ul TREBUIE să conțină folder-ul expense-web/
```

### 4. **Telegram Bot Token**
```
Token de la @BotFather
Exemplu: 8260315731:AAHmndoA83ipjp373bH4dFT0uNqtMIvNLCk
```

### 5. **Groq API Key**
```
De pe: https://console.groq.com/keys
Exemplu: gsk_xxx...
```

### 6. **Database Password**
```
Alege o parolă puternică pentru PostgreSQL
Exemplu: ExpenseDB2024!Secure
```

### 7. **Encryption Key**
```
Apasă ENTER pentru generare automată (recomandat)
SAU introduce manual 32 caractere
```

---

## 🎬 Ce se Întâmplă Pas cu Pas

### STEP 1: System Detection
```
[INFO] Detected OS: ubuntu 22.04
[INFO] Updating system packages...
[SUCCESS] System updated successfully
```

### STEP 2: Installing Git
```
[INFO] Installing Git...
[SUCCESS] Git installed successfully
```

### STEP 3: GitHub SSH Key Setup
```
========================================
YOUR PUBLIC SSH KEY (add this to GitHub):
========================================
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxx...
========================================

📌 ACȚIUNE NECESARĂ:
1. Copiază cheia SSH
2. Du-te la: https://github.com/settings/keys
3. Click "New SSH key"
4. Paste cheia
5. Click "Add SSH key"
6. Apasă ENTER în terminal
```

### STEP 4: Installing Docker
```
[INFO] Installing Docker...
[SUCCESS] Docker installed successfully
[SUCCESS] Docker Compose is available
```

### STEP 5: Application Configuration
```
Enter GitHub repository URL: git@github.com:user/TelegramBotAI.git
Enter Telegram Bot Token: 8260315731:AAHmndoA...
Enter Groq API Key: gsk_xxx...
Enter database password: ExpenseDB2024!Secure
Enter encryption key (or ENTER): [ENTER]
[INFO] Generated encryption key: a3K9mP2xL...
```

### STEP 6-12: Automatic Setup
```
[INFO] Cloning repository...
[SUCCESS] Repository cloned
[INFO] Creating environment configuration...
[INFO] Creating Docker Compose configuration...
[INFO] Creating Dockerfile...
[INFO] Creating Nginx configuration...
[INFO] Creating Python requirements...
[INFO] Creating application structure...
[SUCCESS] Web UI found in repository
[SUCCESS] Web UI configuration created
```

### STEP 13: Firewall Configuration
```
[INFO] Configuring UFW firewall...
[SUCCESS] Firewall configured
Ports opened: 22, 80, 443, 3000, 8000
```

### STEP 14: Building and Starting
```
[INFO] Building Docker images...
[+] Building backend... ✓
[+] Building web UI (Next.js)... ✓
[INFO] Starting containers...
[SUCCESS] All containers started
```

### STEP 15: Database Setup
```
[INFO] Running database migrations...
[SUCCESS] Database migrations completed
```

### STEP 16: Verification
```
[INFO] Testing health endpoint...
[SUCCESS] Application is running and healthy!
```

---

## 🎉 Deployment Complete!

După finalizare, vei vedea:

```
========================================
Deployment Summary
========================================
Application Directory: /opt/expensebot

🌐 Web UI (Next.js):
   http://65.21.110.105
   http://65.21.110.105:3000 (direct)

🔌 Backend API:
   http://65.21.110.105:8000
   http://65.21.110.105/api/ (via nginx)

📚 API Documentation:
   http://65.21.110.105/docs

❤️  Health Check:
   http://65.21.110.105/health
========================================
```

---

## 🌐 Cum Accesezi Aplicația

### Opțiunea 1: Prin Nginx (Recomandat)
```
🖥️  Deschide browser-ul:
http://65.21.110.105

➡️  Nginx va ruta automat:
- / → Web UI (Next.js)
- /api/ → Backend API
- /docs → API Documentation
```

### Opțiunea 2: Acces Direct
```
🎨 Web UI:     http://65.21.110.105:3000
🔌 API:        http://65.21.110.105:8000
📚 Docs:       http://65.21.110.105:8000/docs
```

---

## 🏗️ Arhitectura Deployment-ului

```
┌─────────────────────────────────────┐
│         NGINX (Port 80)             │
│     Reverse Proxy & Router          │
└──────────┬──────────────────────────┘
           │
     ┌─────┴─────────┐
     │               │
     ▼               ▼
┌─────────┐    ┌──────────────┐
│  Web UI │    │  Backend API │
│ Next.js │    │   FastAPI    │
│ Port    │    │   Port 8000  │
│  3000   │    └──────┬───────┘
└─────────┘           │
                      ├──────┐
                      │      │
                 ┌────▼──┐ ┌─▼────┐
                 │ Postgres│ │ Redis │
                 │  DB   │ │ Cache │
                 └───────┘ └──────┘
```

---

## 📊 Comenzi Utile Post-Deployment

### Vezi Status
```bash
cd /opt/expensebot
docker compose ps
```

Output așteptat:
```
NAME                STATUS              PORTS
expensebot_app      Up (healthy)       0.0.0.0:8000->8000/tcp
expensebot_web      Up                 0.0.0.0:3000->3000/tcp
expensebot_db       Up (healthy)       5432/tcp
expensebot_redis    Up (healthy)       6379/tcp
expensebot_nginx    Up                 0.0.0.0:80->80/tcp
```

### Vezi Log-uri
```bash
# Toate serviciile
docker compose logs -f

# Doar Web UI
docker compose logs -f web

# Doar Backend
docker compose logs -f app

# Doar Database
docker compose logs -f db

# Ultimele 50 linii
docker compose logs --tail=50
```

### Restart Servicii
```bash
# Restart toate
docker compose restart

# Restart doar Web UI
docker compose restart web

# Restart doar Backend
docker compose restart app
```

### Stop și Rebuild
```bash
cd /opt/expensebot

# Oprește tot
docker compose down

# Rebuild și pornește
docker compose up --build -d

# Vezi logs
docker compose logs -f
```

### Verifică Health
```bash
# Backend health
curl http://localhost:8000/health

# Web UI (trebuie să returneze HTML)
curl http://localhost:3000
```

---

## 🐛 Troubleshooting

### Web UI nu se încarcă

**1. Verifică dacă containerul rulează:**
```bash
docker compose ps web
```

**2. Vezi log-urile:**
```bash
docker compose logs web --tail=100
```

**3. Verifică build-ul:**
```bash
docker compose logs web | grep -i error
```

**4. Rebuild Web UI:**
```bash
docker compose stop web
docker compose rm -f web
docker compose up --build -d web
```

---

### Backend API nu răspunde

**1. Verifică health:**
```bash
curl http://localhost:8000/health
```

**2. Vezi log-uri:**
```bash
docker compose logs app --tail=50
```

**3. Verifică database connection:**
```bash
docker compose exec app env | grep DATABASE
```

---

### Nginx nu routează corect

**1. Verifică configurația:**
```bash
docker compose exec nginx nginx -t
```

**2. Vezi log-uri:**
```bash
docker compose logs nginx
```

**3. Restart Nginx:**
```bash
docker compose restart nginx
```

---

### Web UI afișează eroare de conexiune la API

**Verifică variabilele de environment:**
```bash
cd /opt/expensebot/expense-web
cat .env.local
```

Trebuie să conțină:
```
NEXT_PUBLIC_API_URL=http://65.21.110.105:8000
API_BASE_URL=http://app:8000
```

Dacă lipsesc, recrează-le:
```bash
cd /opt/expensebot
cat > expense-web/.env.local << EOF
NEXT_PUBLIC_API_URL=http://65.21.110.105:8000
API_BASE_URL=http://app:8000
EOF

docker compose restart web
```

---

## 🔒 Securitate

### Credențialele Tale Sunt În:
```
/opt/expensebot/.env          ← Environment variables
/opt/expensebot/.credentials  ← Backup securizat (chmod 600)
```

### Schimbă Parola SSH (IMPORTANT!)
```bash
passwd
```

### Configurează SSH Keys (Recomandat)
```bash
# Pe calculatorul local
ssh-keygen -t ed25519
ssh-copy-id root@65.21.110.105

# Pe server, dezactivează parola
nano /etc/ssh/sshd_config
# Setează: PasswordAuthentication no
systemctl restart sshd
```

---

## 🎨 Ce Poți Face în Web UI

După ce accesezi `http://65.21.110.105`:

### ✅ Dashboard
- Vezi toate cheltuielile
- Filtrare după categorie
- Căutare după vendor/sumă

### ✅ Upload Bonuri
- Upload poză bon fiscal
- Groq AI extrage automat datele
- Preview și editare înainte de salvare

### ✅ Statistici
- Grafice pe categorii
- Total cheltuieli pe lună
- Top vendors

### ✅ Export
- Export CSV
- Filtrare după perioadă
- Export după categorie

---

## 🔄 Update Aplicația

Când faci modificări în cod:

### Update Backend
```bash
cd /opt/expensebot
git pull
docker compose up --build -d app
```

### Update Web UI
```bash
cd /opt/expensebot
git pull
docker compose up --build -d web
```

### Update Tot
```bash
cd /opt/expensebot
git pull
docker compose down
docker compose up --build -d
```

---

## 📈 Monitoring

### Verifică Utilizare Resurse
```bash
docker stats
```

### Verifică Disk Space
```bash
df -h
docker system df
```

### Cleanup (Dacă rămâi fără spațiu)
```bash
# Șterge containere oprite
docker container prune -f

# Șterge imagini nefolosite
docker image prune -a -f

# Șterge volumes nefolosite (ATENȚIE: șterge date!)
docker volume prune -f
```

---

## 🌍 Setup Domeniu (Opțional)

Dacă ai un domeniu (ex: `expenses.example.com`):

### 1. Configurează DNS
```
Tip: A Record
Nume: expenses (sau @)
Valoare: 65.21.110.105
TTL: 3600
```

### 2. Actualizează Nginx
```bash
cd /opt/expensebot
nano nginx.conf

# Schimbă:
server_name _;
# Cu:
server_name expenses.example.com;

docker compose restart nginx
```

### 3. Instalează SSL (Let's Encrypt)
```bash
# Coming soon: script automat pentru SSL
```

---

## 📝 Notițe Importante

- ✅ **Toate serviciile pornesc automat** la reboot server
- ✅ **Backup automat** pentru database (volum Docker persistent)
- ✅ **Log-uri** salvate în `/opt/expensebot/logs`
- ✅ **Uploads** în `/opt/expensebot/uploads`
- ⚠️ **Schimbă parola SSH** după deployment!
- ⚠️ **Păstrează** fișierul `.credentials` în siguranță

---

## ✅ Checklist Post-Deployment

- [ ] Web UI accesibil pe `http://65.21.110.105`
- [ ] API funcționează pe `http://65.21.110.105:8000`
- [ ] API Docs accesibile pe `http://65.21.110.105/docs`
- [ ] Health check returnează "healthy"
- [ ] Toate containerele sunt "Up" și "healthy"
- [ ] Firewall configurat corect
- [ ] Parola SSH schimbată
- [ ] Credențialele salvate în loc sigur

---

**Succes cu deployment-ul! 🚀**

**Întrebări?** Verifică log-urile cu `docker compose logs -f`
