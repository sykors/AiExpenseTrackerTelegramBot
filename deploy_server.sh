#!/bin/bash

# ============================================================================
# EXPENSE BOT AI - Complete Server Deployment Script
# ============================================================================
# This script will:
# 1. Detect OS and install all dependencies (Git, Docker, etc.)
# 2. Setup GitHub SSH keys
# 3. Clone repository
# 4. Configure environment
# 5. Deploy application with Docker
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}\n"
}

# ============================================================================
# STEP 1: DETECT OS AND INSTALL BASIC DEPENDENCIES
# ============================================================================

print_header "STEP 1: System Detection and Basic Setup"

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
    print_info "Detected OS: $OS $VERSION"
else
    print_error "Cannot detect OS. This script supports Ubuntu/Debian/CentOS"
    exit 1
fi

# Update system
print_info "Updating system packages..."
if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
    apt-get update -y
    apt-get upgrade -y
    PACKAGE_MANAGER="apt-get"
    INSTALL_CMD="apt-get install -y"
elif [[ "$OS" == "centos" ]] || [[ "$OS" == "rhel" ]]; then
    yum update -y
    PACKAGE_MANAGER="yum"
    INSTALL_CMD="yum install -y"
else
    print_error "Unsupported OS: $OS"
    exit 1
fi

print_success "System updated successfully"

# ============================================================================
# STEP 2: INSTALL GIT
# ============================================================================

print_header "STEP 2: Installing Git"

if command -v git &> /dev/null; then
    print_info "Git is already installed: $(git --version)"
else
    print_info "Installing Git..."
    $INSTALL_CMD git
    print_success "Git installed successfully: $(git --version)"
fi

# ============================================================================
# STEP 3: SETUP GITHUB SSH KEYS
# ============================================================================

print_header "STEP 3: GitHub SSH Key Setup"

print_info "Setting up GitHub SSH access..."
echo -e "${YELLOW}Please provide the following information:${NC}"

# Ask for GitHub username
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter your GitHub email: " GITHUB_EMAIL

# Configure git
git config --global user.name "$GITHUB_USERNAME"
git config --global user.email "$GITHUB_EMAIL"
print_success "Git configured with username: $GITHUB_USERNAME"

# Check if SSH key already exists
if [ -f ~/.ssh/id_ed25519 ]; then
    print_warning "SSH key already exists at ~/.ssh/id_ed25519"
    read -p "Do you want to use the existing key? (y/n): " USE_EXISTING
    if [[ "$USE_EXISTING" != "y" ]]; then
        print_info "Generating new SSH key..."
        ssh-keygen -t ed25519 -C "$GITHUB_EMAIL" -f ~/.ssh/id_ed25519 -N ""
    fi
else
    print_info "Generating new SSH key..."
    mkdir -p ~/.ssh
    ssh-keygen -t ed25519 -C "$GITHUB_EMAIL" -f ~/.ssh/id_ed25519 -N ""
fi

# Start SSH agent and add key
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Display public key
print_success "SSH key generated successfully!"
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}YOUR PUBLIC SSH KEY (add this to GitHub):${NC}"
echo -e "${YELLOW}========================================${NC}"
cat ~/.ssh/id_ed25519.pub
echo -e "${YELLOW}========================================${NC}\n"

print_warning "IMPORTANT: Copy the key above and add it to GitHub:"
print_info "1. Go to: https://github.com/settings/keys"
print_info "2. Click 'New SSH key'"
print_info "3. Paste the key above"
print_info "4. Click 'Add SSH key'"

read -p "Press ENTER after you've added the SSH key to GitHub..."

# Test GitHub connection
print_info "Testing GitHub connection..."
ssh -T git@github.com 2>&1 | grep -q "successfully authenticated" && print_success "GitHub connection successful!" || print_warning "GitHub connection test showed: Check if key was added correctly"

# ============================================================================
# STEP 4: INSTALL DOCKER AND DOCKER COMPOSE
# ============================================================================

print_header "STEP 4: Installing Docker and Docker Compose"

if command -v docker &> /dev/null; then
    print_info "Docker is already installed: $(docker --version)"
else
    print_info "Installing Docker..."

    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        # Install Docker on Ubuntu/Debian
        $INSTALL_CMD ca-certificates curl gnupg lsb-release

        # Add Docker's official GPG key
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

        # Set up repository
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
          $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

        # Install Docker Engine
        apt-get update -y
        $INSTALL_CMD docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    elif [[ "$OS" == "centos" ]] || [[ "$OS" == "rhel" ]]; then
        # Install Docker on CentOS/RHEL
        $INSTALL_CMD yum-utils
        yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        $INSTALL_CMD docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi

    # Start Docker service
    systemctl start docker
    systemctl enable docker

    print_success "Docker installed successfully: $(docker --version)"
fi

# Verify Docker Compose
if command -v docker compose &> /dev/null; then
    print_success "Docker Compose is available: $(docker compose version)"
else
    print_error "Docker Compose plugin not found"
    exit 1
fi

# ============================================================================
# STEP 5: COLLECT APPLICATION CREDENTIALS
# ============================================================================

print_header "STEP 5: Application Configuration"

print_info "Please provide the following credentials for the application:"

# Ask for all necessary credentials
read -p "Enter GitHub repository URL (e.g., git@github.com:username/repo.git): " REPO_URL
read -p "Enter Telegram Bot Token: " TELEGRAM_TOKEN
read -p "Enter Groq API Key: " GROQ_API_KEY
read -p "Enter database password for PostgreSQL: " DB_PASSWORD
read -p "Enter encryption key (32 characters, or press ENTER to generate): " ENCRYPTION_KEY

# Generate encryption key if not provided
if [ -z "$ENCRYPTION_KEY" ]; then
    ENCRYPTION_KEY=$(openssl rand -base64 32)
    print_info "Generated encryption key: $ENCRYPTION_KEY"
fi

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)
print_info "Generated JWT secret"

# ============================================================================
# STEP 6: CLONE REPOSITORY
# ============================================================================

print_header "STEP 6: Cloning Repository"

# Create application directory
APP_DIR="/opt/expensebot"
print_info "Creating application directory: $APP_DIR"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository
if [ -d ".git" ]; then
    print_warning "Repository already exists. Pulling latest changes..."
    git pull
else
    print_info "Cloning repository: $REPO_URL"
    git clone $REPO_URL .
fi

print_success "Repository cloned successfully"

# ============================================================================
# STEP 7: CREATE ENVIRONMENT FILE
# ============================================================================

print_header "STEP 7: Creating Environment Configuration"

cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://expensebot:${DB_PASSWORD}@db:5432/expensebot
POSTGRES_USER=expensebot
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=expensebot

# API Keys
GROQAPIKEY=${GROQ_API_KEY}
telegramToken=${TELEGRAM_TOKEN}

# Security
ENCRYPTION_KEY=${ENCRYPTION_KEY}
JWT_SECRET=${JWT_SECRET}

# Application Settings
APP_ENV=production
DEBUG=false
LOG_LEVEL=info

# Redis
REDIS_URL=redis://redis:6379/0
EOF

print_success "Environment file created: .env"

# ============================================================================
# STEP 8: CREATE DOCKER COMPOSE FILE
# ============================================================================

print_header "STEP 8: Creating Docker Compose Configuration"

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: expensebot_db
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - expensebot_network

  redis:
    image: redis:7-alpine
    container_name: expensebot_redis
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - expensebot_network

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: expensebot_app
    restart: always
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - GROQAPIKEY=${GROQAPIKEY}
      - telegramToken=${telegramToken}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=${REDIS_URL}
      - APP_ENV=${APP_ENV}
      - DEBUG=${DEBUG}
      - LOG_LEVEL=${LOG_LEVEL}
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - expensebot_network

  web:
    build:
      context: ./expense-web
      dockerfile: Dockerfile
      target: prod
      args:
        - NEXT_PUBLIC_API_URL=http://65.21.110.105:8000
        - API_BASE_URL=http://app:8000
    container_name: expensebot_web
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://65.21.110.105:8000
      - API_BASE_URL=http://app:8000
    depends_on:
      - app
    networks:
      - expensebot_network

  nginx:
    image: nginx:alpine
    container_name: expensebot_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
      - web
    networks:
      - expensebot_network

volumes:
  postgres_data:
  redis_data:

networks:
  expensebot_network:
    driver: bridge
EOF

print_success "Docker Compose file created"

# ============================================================================
# STEP 9: CREATE DOCKERFILE
# ============================================================================

print_header "STEP 9: Creating Dockerfile"

cat > Dockerfile << 'EOF'
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs

# Expose port
EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
EOF

print_success "Dockerfile created"

# ============================================================================
# STEP 10: CREATE NGINX CONFIGURATION
# ============================================================================

print_header "STEP 10: Creating Nginx Configuration"

cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:8000;
    }

    upstream web {
        server web:3000;
    }

    server {
        listen 80;
        server_name _;

        client_max_body_size 50M;

        # Web UI (Next.js)
        location / {
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support for Next.js hot reload
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # API Backend
        location /api/ {
            proxy_pass http://app/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # API Docs
        location /docs {
            proxy_pass http://app/docs;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /openapi.json {
            proxy_pass http://app/openapi.json;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Health check
        location /health {
            access_log off;
            proxy_pass http://app/health;
        }
    }
}
EOF

print_success "Nginx configuration created"

# ============================================================================
# STEP 11: CREATE REQUIREMENTS.TXT
# ============================================================================

print_header "STEP 11: Creating Python Requirements"

cat > requirements.txt << 'EOF'
# Web Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.23
alembic==1.12.1
psycopg2-binary==2.9.9

# Redis
redis==5.0.1

# Authentication & Security
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
cryptography==41.0.7

# API Clients
httpx==0.25.2
groq==0.4.0

# Telegram Bot
python-telegram-bot==20.7

# Utilities
pydantic==2.5.0
pydantic-settings==2.1.0
python-dateutil==2.8.2
pillow==10.1.0
EOF

print_success "Requirements file created"

# ============================================================================
# STEP 12: CREATE BASIC APPLICATION STRUCTURE
# ============================================================================

print_header "STEP 12: Creating Application Structure"

# Create directory structure
mkdir -p app/{models,routers,services,utils,schemas}
mkdir -p uploads logs

# Create __init__.py files
touch app/__init__.py
touch app/models/__init__.py
touch app/routers/__init__.py
touch app/services/__init__.py
touch app/utils/__init__.py
touch app/schemas/__init__.py

# Create basic main.py if it doesn't exist
if [ ! -f main.py ]; then
    cat > main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Expense Bot AI",
    description="AI-powered expense tracking bot",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "expense-bot-ai",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Expense Bot AI",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF
fi

print_success "Application structure created"

# ============================================================================
# STEP 12.5: COPY AND CONFIGURE WEB UI
# ============================================================================

print_header "STEP 12.5: Setting Up Web UI (Next.js)"

# Check if expense-web directory exists in the repository
if [ -d "expense-web" ]; then
    print_info "Web UI found in repository"

    # Create .env file for Next.js
    cat > expense-web/.env.local << EOF
NEXT_PUBLIC_API_URL=http://$(hostname -I | awk '{print $1}'):8000
API_BASE_URL=http://app:8000
EOF

    print_success "Web UI configuration created"
else
    print_warning "Web UI (expense-web) not found in repository. Skipping UI setup."
fi

# ============================================================================
# STEP 13: CONFIGURE FIREWALL
# ============================================================================

print_header "STEP 13: Configuring Firewall"

if command -v ufw &> /dev/null; then
    print_info "Configuring UFW firewall..."

    # Allow SSH
    ufw allow 22/tcp

    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Allow API and Web UI ports (for direct access)
    ufw allow 8000/tcp
    ufw allow 3000/tcp

    # Enable UFW
    echo "y" | ufw enable

    print_success "Firewall configured"
else
    print_warning "UFW not found. Please configure firewall manually."
fi

# ============================================================================
# STEP 14: BUILD AND START DOCKER CONTAINERS
# ============================================================================

print_header "STEP 14: Building and Starting Application"

print_info "Building Docker images..."
docker compose build

print_info "Starting containers..."
docker compose up -d

# Wait for services to be healthy
print_info "Waiting for services to be healthy..."
sleep 10

# Check container status
docker compose ps

# ============================================================================
# STEP 15: RUN DATABASE MIGRATIONS
# ============================================================================

print_header "STEP 15: Database Setup"

print_info "Waiting for database to be ready..."
sleep 5

# Check if alembic is configured
if [ -d "alembic" ]; then
    print_info "Running database migrations..."
    docker compose exec app alembic upgrade head
    print_success "Database migrations completed"
else
    print_warning "Alembic not configured. Skipping migrations."
fi

# ============================================================================
# STEP 16: VERIFY DEPLOYMENT
# ============================================================================

print_header "STEP 16: Verifying Deployment"

# Test health endpoint
sleep 5
print_info "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8000/health || echo "failed")

if [[ "$HEALTH_RESPONSE" == *"healthy"* ]]; then
    print_success "Application is running and healthy!"
else
    print_error "Application health check failed"
    print_info "Checking logs..."
    docker compose logs app --tail=50
fi

# ============================================================================
# DEPLOYMENT SUMMARY
# ============================================================================

print_header "DEPLOYMENT COMPLETE!"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Application Directory:${NC} $APP_DIR"
echo -e ""
echo -e "${GREEN}🌐 Web UI (Next.js):${NC}"
echo -e "   ${BLUE}http://$(hostname -I | awk '{print $1}')${NC}"
echo -e "   ${BLUE}http://$(hostname -I | awk '{print $1}'):3000${NC} (direct)"
echo -e ""
echo -e "${GREEN}🔌 Backend API:${NC}"
echo -e "   ${BLUE}http://$(hostname -I | awk '{print $1}'):8000${NC}"
echo -e "   ${BLUE}http://$(hostname -I | awk '{print $1}')/api/${NC} (via nginx)"
echo -e ""
echo -e "${GREEN}📚 API Documentation:${NC}"
echo -e "   ${BLUE}http://$(hostname -I | awk '{print $1}')/docs${NC}"
echo -e ""
echo -e "${GREEN}❤️  Health Check:${NC}"
echo -e "   ${BLUE}http://$(hostname -I | awk '{print $1}')/health${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Useful Commands:${NC}"
echo -e "  View logs:          ${BLUE}cd $APP_DIR && docker compose logs -f${NC}"
echo -e "  Restart services:   ${BLUE}cd $APP_DIR && docker compose restart${NC}"
echo -e "  Stop services:      ${BLUE}cd $APP_DIR && docker compose down${NC}"
echo -e "  Rebuild and start:  ${BLUE}cd $APP_DIR && docker compose up --build -d${NC}"
echo -e "  Check status:       ${BLUE}cd $APP_DIR && docker compose ps${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  1. Configure your domain DNS to point to: ${BLUE}$(hostname -I | awk '{print $1}')${NC}"
echo -e "  2. Setup SSL certificate with Let's Encrypt"
echo -e "  3. Test the Telegram bot"
echo -e "  4. Monitor logs for any errors"

echo -e "\n${GREEN}Deployment completed successfully!${NC}\n"

# Save credentials to secure file
cat > $APP_DIR/.credentials << EOF
DEPLOYMENT_DATE=$(date)
ENCRYPTION_KEY=${ENCRYPTION_KEY}
JWT_SECRET=${JWT_SECRET}
DB_PASSWORD=${DB_PASSWORD}
EOF

chmod 600 $APP_DIR/.credentials

print_success "Credentials saved to: $APP_DIR/.credentials (keep this secure!)"

exit 0
