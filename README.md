# SchoolCronicle

> Edtech web application for standardised chronicle contribution workflows.
> Teachers submit structured appointments and images; coordinators export chronicle-ready data.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 18 |
| Backend | NestJS (Node.js 20 LTS) |
| Database | PostgreSQL 16 |
| Cache / Sessions | Redis 7 |
| Object Storage | MinIO |
| Production Deployment | Docker Compose (local server) |

---

## Local Development Setup

All services run natively on your machine — no Docker required for development.

### Prerequisites

Install the following on macOS (Homebrew):

```bash
# Node.js 20 LTS
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Angular CLI
npm install -g @angular/cli@18

# NestJS CLI
npm install -g @nestjs/cli

# PostgreSQL 16
brew install postgresql@16
brew services start postgresql@16

# Redis
brew install redis
brew services start redis

# MinIO
brew install minio/stable/minio
```

**On Linux (Ubuntu/Debian):**

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Angular CLI + NestJS CLI
npm install -g @angular/cli@18 @nestjs/cli

# PostgreSQL 16
sudo apt install -y postgresql-16
sudo systemctl start postgresql

# Redis
sudo apt install -y redis-server
sudo systemctl start redis

# MinIO — download binary
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio && sudo mv minio /usr/local/bin/
```

---

### 1. Clone & Configure

```bash
git clone <repo-url> schoolchronicle
cd schoolchronicle

# Create local environment file from example
cp .env.example .env.local
```

Edit `.env.local` — set passwords and SMTP details. See comments in file.

---

### 2. Generate JWT Keys

```bash
mkdir -p .keys

# Generate RS256 key pair
openssl genrsa -out .keys/jwt-private.pem 4096
openssl rsa -in .keys/jwt-private.pem -pubout -out .keys/jwt-public.pem

echo "JWT_PRIVATE_KEY=\"$(cat .keys/jwt-private.pem)\"" >> .env.local
echo "JWT_PUBLIC_KEY=\"$(cat .keys/jwt-public.pem)\"" >> .env.local
```

---

### 3. Set Up PostgreSQL

```bash
# Create database and user
psql postgres <<EOF
CREATE USER schoolchronicle WITH PASSWORD 'your_password_here';
CREATE DATABASE schoolchronicle OWNER schoolchronicle;
GRANT ALL PRIVILEGES ON DATABASE schoolchronicle TO schoolchronicle;
EOF
```

Use the same password you set in `.env.local` for `DB_PASSWORD`.

---

### 4. Set Up Redis

Redis requires a password (matches `REDIS_PASSWORD` in `.env.local`).

```bash
# Edit Redis config to require a password
# macOS (Homebrew):
echo "requirepass your_redis_password" >> /opt/homebrew/etc/redis.conf
brew services restart redis

# Linux:
echo "requirepass your_redis_password" | sudo tee -a /etc/redis/redis.conf
sudo systemctl restart redis
```

---

### 5. Start MinIO

```bash
mkdir -p ~/minio-data

# Start MinIO server (keep this terminal open, or run as background service)
MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=your_minio_password \
  minio server ~/minio-data --console-address ":9001"
```

MinIO API: http://localhost:9000
MinIO Console: http://localhost:9001

Create the `schoolchronicle` bucket via the console or:
```bash
# Install mc (MinIO client)
brew install minio/stable/mc

mc alias set local http://localhost:9000 minioadmin your_minio_password
mc mb local/schoolchronicle
```

---

### 6. Install Backend Dependencies & Run Migrations

```bash
cd backend
npm install

# Copy env file
cp ../.env.local .env

# Run database migrations (creates all tables)
npm run migration:run
```

---

### 7. Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

### 8. Start Development Servers

**Terminal 1 — NestJS API:**
```bash
cd backend
npm run start:dev
```
API running at: http://localhost:3000
Health check: http://localhost:3000/api/v1/health

**Terminal 2 — Angular frontend:**
```bash
cd frontend
ng serve
```
App running at: http://localhost:4200

---

### Verify Setup

```bash
# Check API health
curl http://localhost:3000/api/v1/health
# Expected: {"status":"ok","timestamp":"...","db":"ok"}
```

Open http://localhost:4200 in your browser.

---

## Project Structure

```
schoolchronicle/
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── auth/             # Authentication module
│   │   ├── users/            # User management
│   │   ├── schools/          # School registry
│   │   ├── persons/          # Person registry
│   │   ├── contributions/    # Contribution workflow
│   │   ├── media/            # Image upload (MinIO)
│   │   ├── gdpr/             # GDPR / consent management
│   │   ├── export/           # Data export & PDF generation
│   │   ├── admin/            # Appointment types, config
│   │   └── migrations/       # TypeORM migrations
│   ├── Dockerfile            # Production build
│   └── package.json
│
├── frontend/                 # Angular 18 SPA
│   ├── src/app/
│   │   ├── auth/             # Login, password reset
│   │   ├── dashboard/        # Contribution list
│   │   ├── contributions/    # Create / edit contributions
│   │   ├── registry/         # Persons & schools
│   │   ├── export/           # Export trigger & download
│   │   ├── admin/            # Account management
│   │   └── shared/           # Components, pipes, services
│   ├── Dockerfile            # Production build
│   └── package.json
│
├── nginx/
│   └── nginx.conf            # Production reverse proxy + TLS
│
├── docs/                     # BMAD planning documents
│   ├── product-brief-*.md
│   ├── prd-*.md
│   ├── architecture-*.md
│   ├── sprint-plan-*.md
│   └── sprint-status.yaml
│
├── docker-compose.yml        # Production deployment
├── .env.example              # Environment variable template
└── README.md
```

---

## Running Tests

```bash
# Backend unit + integration tests
cd backend
npm test                      # Run all tests
npm run test:cov              # With coverage report

# Frontend unit tests
cd frontend
ng test

# E2E tests (Playwright)
cd frontend
npm run e2e
```

---

## Production Deployment

Production runs via Docker Compose on the school's local server. See `docker-compose.yml`.

```bash
# 1. Configure production .env (copy from .env.example, set production values)
cp .env.example .env

# 2. Generate SSL certificate (or provide school CA-signed cert)
#    Place cert.pem and key.pem in nginx/ssl/

# 3. Start all services
docker compose up -d

# 4. Verify
docker compose ps
curl https://localhost/health
```

---

## Environment Files

| File | Purpose | Committed? |
|------|---------|-----------|
| `.env.example` | Template with all variables | ✅ Yes |
| `.env.local` | Local development values | ❌ No |
| `.env` | Production values | ❌ No |

---

## BMAD Planning Documents

This project was planned using BMAD Method v6:

| Document | Path |
|----------|------|
| Product Brief | `docs/product-brief-schoolCronical-2026-05-02.md` |
| PRD | `docs/prd-schoolCronical-2026-05-02.md` |
| Architecture | `docs/architecture-schoolCronical-2026-05-02.md` |
| Sprint Plan | `docs/sprint-plan-schoolCronical-2026-05-02.md` |
