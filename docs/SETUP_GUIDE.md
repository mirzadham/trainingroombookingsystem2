# 🚀 Complete Developer Setup & Onboarding Guide
## MIMOS Academy Training Room Booking System

Welcome to the team! This guide provides a step-by-step walkthrough to help new collaborators set up, configure, run, test, and contribute to the **MIMOS Academy Training Room Booking System** codebase after cloning the repository.

---

## 📋 1. Prerequisites Checklist

Before you begin, ensure your local development machine has the following tools installed:

| Tool | Minimum Version | Description | Verification Command |
|---|---|---|---|
| **PHP** | 8.3+ | PHP Scripting Language | `php -v` |
| **Composer** | 2.x+ | PHP Package Manager | `composer --version` |
| **Node.js** | 18.x / 20.x+ | JavaScript Runtime Environment | `node -v` |
| **NPM** | 9.x / 10.x+ | Node Package Manager | `npm -v` |
| **Git** | 2.x+ | Version Control System | `git --version` |
| **Database** | MySQL 8.0+ | Relational Database (via Laragon, XAMPP, or standalone MySQL server) | `mysql --version` |

> **PHP Extension Requirements**:  
> Ensure your `php.ini` has the following extensions enabled: `mbstring`, `pdo_mysql`, `bcmath`, `ctype`, `fileinfo`, `json`, `openssl`, `tokenizer`, `xml`, `gd`.

---

## 🛠️ 2. Step-by-Step Repository Setup

### Step 1: Clone the Repository
Clone the repository from GitHub and navigate into the project directory:
```bash
git clone https://github.com/mirzadham/trainingroombookingsystem2.git
cd trainingroombookingsystem2
```

### Step 2: Install Backend Dependencies
Install all required PHP packages using Composer:
```bash
composer install
```

### Step 3: Configure Environment Variables
Copy the sanitized template `.env.example` to create your local `.env` configuration file:
```bash
# On Linux/macOS or Git Bash:
cp .env.example .env

# On Windows PowerShell:
Copy-Item .env.example .env
```

Generate the Laravel Application Key:
```bash
php artisan key:generate
```

> **MySQL Database Configuration**:  
> `.env` comes preconfigured for MySQL. Ensure your local MySQL server (Laragon / XAMPP) is running:
> 1. Verify your `.env` database settings:
>    ```ini
>    DB_CONNECTION=mysql
>    DB_HOST=127.0.0.1
>    DB_PORT=3306
>    DB_DATABASE=training_room_booking
>    DB_USERNAME=root
>    DB_PASSWORD=
>    ```
> 2. Create an empty database named `training_room_booking` in your MySQL server.

### Step 4: Install Frontend Dependencies
Install all JavaScript dependencies for React, Vite, Tailwind CSS v4, and React Query:
```bash
npm install
```

### Step 5: Database Migration & Seeding
Run all database migrations and populate the database with seed data (default users, locations, and training rooms):
```bash
php artisan migrate:fresh --seed
```

### Step 6: Create Storage Symbolic Link
Link the storage directory to the public directory so uploaded room images and media are accessible via the web server:
```bash
php artisan storage:link
```

---

## 🔑 3. Mock Development Accounts & Seed Credentials

> ⚠️ **SECURITY DISCLAIMER FOR LOCAL DEVELOPMENT ONLY**:  
> The accounts listed below are **dummy mock seeds** generated exclusively for local development and offline testing via `php artisan db:seed`.  
> - **NEVER** use or seed these dummy accounts in staging or production environments.  
> - Passwords default to `password` locally, or can be customized in `.env` via `SEED_ADMIN_PASSWORD`.

| Role | Mock Email | Default Password | Environment |
|---|---|---|---|
| **Super Admin** | `superadmin@mimos.test` | `password` | Local Dev Only |
| **TPM Location Admin** | `tpm.admin@mimos.test` | `password` | Local Dev Only |
| **KHTP Location Admin** | `khtp.admin@mimos.test` | `password` | Local Dev Only |
| **Internal User** | `ahmad.razak@mimos.test` | `password` | Local Dev Only |
| **External User** | `john.doe@example.com` | `password` | Local Dev Only |

---

## 💻 4. Running the Application Locally

You need both the **Laravel Backend API Server** and the **Vite Frontend HMR Server** running simultaneously.

### Option A: Standard CLI (Two Terminal Windows)

**Terminal 1 (Backend API)**:
```bash
php artisan serve
```
*App will start listening at `http://127.0.0.1:8000`.*

**Terminal 2 (Frontend Vite HMR)**:
```bash
npm run dev
```
*Vite will start listening at `http://localhost:5173` with Hot Module Replacement enabled.*

Open your browser and navigate to `http://localhost:5173`.

---

### Option B: Using Laragon (Windows Virtual Hosts)

If you use **Laragon**:
1. Access your site directly via your auto-generated host: `http://trainingroombookingsystem2.test`
2. Open a terminal in the project directory and start Vite:
   ```bash
   npm run dev
   ```

---

## 🧪 5. Testing & Quality Verification Commands

Before pushing any code or opening a Pull Request, run the following verification commands to ensure zero regressions:

### Backend Checks
```bash
# 1. Run PHPUnit Test Suite
vendor/bin/phpunit

# 2. Verify Backend Code Formatting (Laravel Pint)
vendor/bin/pint --test

# Auto-fix code formatting if Pint detects styling issues:
vendor/bin/pint
```

### Frontend Checks
```bash
# 1. Run ESLint Code Quality Check
npm run lint

# 2. Run Prettier Formatting
npm run format

# 3. Verify Production Assets Build
npm run build
```

---

## 🌿 6. Daily Contribution Workflow

Please adhere to our structured Git branching strategy:

1. **Pull Latest Main**:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create a Feature/Fix Branch**:
   ```bash
   git checkout -b feat/calendar-export
   # or
   git checkout -b fix/booking-time-overlap
   ```

3. **Commit Your Changes Using Conventional Commits**:
   ```bash
   git commit -m "feat(calendar): add iCal export capability for approved bookings"
   ```

4. **Push Branch & Open Pull Request**:
   ```bash
   git push origin feat/calendar-export
   ```
   Open a PR against `main` on GitHub. Complete the PR template checklist and wait for CI checks to pass before requesting code review.

---

## ❓ 7. Troubleshooting Common Issues

- **Missing Storage Images**:  
  If room images do not display, ensure you ran `php artisan storage:link`.
- **CORS / Sanctum 401 Unauthorized**:  
  Ensure `SANCTUM_STATEFUL_DOMAINS` in `.env` includes your local development port (e.g. `localhost:5173,127.0.0.1:5173`).
- **Database Connection Refused (MySQL)**:  
  Ensure your MySQL service is started (e.g. Start All in Laragon or MySQL module in XAMPP) and the database `training_room_booking` has been created.
