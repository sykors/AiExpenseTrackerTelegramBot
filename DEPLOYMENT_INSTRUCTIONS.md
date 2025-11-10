# 🚀 Instrucțiuni de Deployment pe Server

## Ce Face Scriptul

Scriptul `deploy_server.sh` face **totul automat** de la 0:

✅ Detectează sistemul de operare (Ubuntu/Debian/CentOS)
✅ Instalează Git
✅ Configurează GitHub SSH keys
✅ Instalează Docker și Docker Compose
✅ Cere toate credențialele necesare (Telegram token, Groq API key, etc.)
✅ Clonează repository-ul
✅ Creează toate fișierele de configurare
✅ Construiește și pornește aplicația
✅ Configurează firewall
✅ Verifică că totul funcționează

---

## 📋 Pași de Urmărit

### 1. Transferă Scriptul pe Server

**Pe calculatorul tău local**, rulează:

```bash
scp deploy_server.sh root@65.21.110.105:/root/
```

Parolă: `XukPiipRCaff`

---

### 2. Conectează-te la Server

```bash
ssh root@65.21.110.105
```

Parolă: `XukPiipRCaff`

---

### 3. Rulează Scriptul

```bash
chmod +x /root/deploy_server.sh
/root/deploy_server.sh
```

---

## 🔑 Informații Necesare (Scriptul te va Întreba)

Scriptul va cere următoarele informații. Pregătește-le dinainte:

### 1. **GitHub Username**
   - Exemplu: `andreim-dev`

### 2. **GitHub Email**
   - Exemplu: `andrei@example.com`

### 3. **GitHub Repository URL**
   - Format SSH: `git@github.com:username/TelegramBotAI.git`
   - Dacă repository-ul este privat, trebuie să adaugi SSH key-ul (scriptul te va ajuta)

### 4. **Telegram Bot Token**
   - Token-ul pe care l-ai primit de la @BotFather
   - Exemplu: `8260315731:AAHmndoA83ipjp373bH4dFT0uNqtMIvNLCk`

### 5. **Groq API Key**
   - Obține-l de pe: https://console.groq.com/keys
   - Exemplu: `gsk_xxx...`

### 6. **Database Password**
   - Alege o parolă puternică pentru PostgreSQL
   - Exemplu: `MySecureDBPass123!`

### 7. **Encryption Key** (OPȚIONAL)
   - Scriptul poate genera automat
   - SAU poți furniza unul de 32 caractere

---

## 🎯 Ce se Întâmplă Pas cu Pas

### Pasul 1: Detectare Sistem
```
[INFO] Detected OS: ubuntu 22.04
[INFO] Updating system packages...
[SUCCESS] System updated successfully
```

### Pasul 2: Instalare Git
```
[INFO] Installing Git...
[SUCCESS] Git installed successfully: git version 2.34.1
```

### Pasul 3: GitHub SSH Setup
```
[INFO] Generating new SSH key...
========================================
YOUR PUBLIC SSH KEY (add this to GitHub):
========================================
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxx... andrei@example.com
========================================

IMPORTANT: Copy the key above and add it to GitHub:
1. Go to: https://github.com/settings/keys
2. Click 'New SSH key'
3. Paste the key above
4. Click 'Add SSH key'

Press ENTER after you've added the SSH key to GitHub...
```

**ACȚIUNE NECESARĂ:**
- Copiază cheia SSH afișată
- Mergi la https://github.com/settings/keys
- Adaugă cheia nouă
- Apasă ENTER în terminal

### Pasul 4: Instalare Docker
```
[INFO] Installing Docker...
[SUCCESS] Docker installed successfully: Docker version 24.0.7
[SUCCESS] Docker Compose is available: Docker Compose version v2.23.0
```

### Pasul 5: Credențiale
```
[INFO] Please provide the following credentials for the application:
Enter GitHub repository URL: git@github.com:andreim-dev/TelegramBotAI.git
Enter Telegram Bot Token: 8260315731:AAHmndoA83ipjp373bH4dFT0uNqtMIvNLCk
Enter Groq API Key: gsk_xxx...
Enter database password: MySecureDBPass123!
Enter encryption key (or press ENTER to generate): [ENTER pentru auto-generare]
```

### Pasul 6-14: Deployment Automat
```
[INFO] Cloning repository...
[SUCCESS] Repository cloned successfully
[INFO] Creating environment configuration...
[SUCCESS] Environment file created
[INFO] Building Docker images...
[INFO] Starting containers...
[SUCCESS] Application is running and healthy!
```

### Pasul 15: Verificare Finală
```
========================================
Deployment Summary
========================================
Application Directory: /opt/expensebot
Application URL: http://65.21.110.105:8000
API Documentation: http://65.21.110.105:8000/docs
Health Check: http://65.21.110.105:8000/health
========================================
```

---

## ✅ După Deployment

### Verifică că Funcționează

1. **Test Health Check:**
```bash
curl http://65.21.110.105:8000/health
```

Răspuns așteptat:
```json
{
  "status": "healthy",
  "service": "expense-bot-ai",
  "version": "1.0.0"
}
```

2. **Vezi Documentația API:**
Deschide în browser: `http://65.21.110.105:8000/docs`

3. **Verifică Containerele:**
```bash
cd /opt/expensebot
docker compose ps
```

Toate serviciile trebuie să fie "Up" și "healthy".

---

## 📊 Comenzi Utile Post-Deployment

### Vezi Log-uri
```bash
cd /opt/expensebot
docker compose logs -f app          # Log-uri aplicație
docker compose logs -f db           # Log-uri database
docker compose logs -f              # Toate log-urile
```

### Restart Servicii
```bash
cd /opt/expensebot
docker compose restart              # Restart toate
docker compose restart app          # Doar aplicația
```

### Stop Servicii
```bash
cd /opt/expensebot
docker compose down                 # Oprește tot
```

### Rebuild și Restart
```bash
cd /opt/expensebot
docker compose down
docker compose up --build -d
```

### Verifică Status
```bash
cd /opt/expensebot
docker compose ps
docker compose top
```

### Accesează Container
```bash
docker compose exec app bash        # Intră în container-ul app
docker compose exec db psql -U expensebot  # Accesează PostgreSQL
```

---

## 🔥 Troubleshooting

### Dacă Aplicația Nu Pornește

1. **Verifică log-urile:**
```bash
cd /opt/expensebot
docker compose logs app --tail=100
```

2. **Verifică că toate serviciile sunt up:**
```bash
docker compose ps
```

3. **Restart complet:**
```bash
docker compose down
docker compose up -d
```

### Dacă GitHub SSH Nu Funcționează

1. **Verifică dacă cheia e adăugată:**
```bash
ssh -T git@github.com
```

2. **Regenerează cheia:**
```bash
ssh-keygen -t ed25519 -C "email@example.com"
cat ~/.ssh/id_ed25519.pub  # Adaugă pe GitHub
```

### Dacă Database-ul Nu Se Conectează

```bash
docker compose logs db
docker compose exec db psql -U expensebot -c "\l"
```

---

## 🔒 Securitate

### Credențialele Tale Sunt Salvate În:
```
/opt/expensebot/.credentials
```

**IMPORTANT:**
- Acest fișier conține toate parolele și cheile
- Este protejat (chmod 600)
- NU-L șterge
- NU-L partaja

### Schimbă Parola SSH (RECOMANDAT)

După deployment, schimbă parola root:
```bash
passwd
```

### Configurare SSH Keys (Mai Sigur)

În loc de parolă, folosește SSH keys:
```bash
# Pe calculatorul tău local
ssh-keygen -t ed25519
ssh-copy-id root@65.21.110.105

# Pe server, dezactivează login cu parolă
nano /etc/ssh/sshd_config
# Setează: PasswordAuthentication no
systemctl restart sshd
```

---

## 🌐 Setup Domeniu (Opțional)

Dacă ai un domeniu (ex: `bot.example.com`):

1. **Configurează DNS:**
   - Tip: A Record
   - Nume: bot (sau @)
   - Valoare: 65.21.110.105

2. **Instalează SSL (Let's Encrypt):**
```bash
cd /opt/expensebot
# Va fi adăugat script separat pentru SSL
```

---

## 📞 Support

Dacă ai probleme:
1. Verifică log-urile cu `docker compose logs -f`
2. Verifică că porturile 80 și 8000 sunt deschise
3. Verifică că toate credențialele sunt corecte în `/opt/expensebot/.env`

---

## 📝 Notițe Importante

- ✅ Scriptul este **idempotent** - poți să-l rulezi de mai multe ori
- ✅ Toate serviciile pornesc automat la reboot-ul serverului
- ✅ Backup automat pentru database (volum Docker persistent)
- ✅ Log-uri salvate în `/opt/expensebot/logs`
- ✅ Fișiere uploadate în `/opt/expensebot/uploads`

---

**Succes cu deployment-ul! 🚀**
