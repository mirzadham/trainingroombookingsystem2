# 🤝 Contributing to MIMOS Academy Training Room Booking System

Welcome! We appreciate your contributions. To maintain high code quality, security, and consistent design aesthetics across the project, please follow the guidelines below.

---

## 🛠️ Developer Setup Quickstart

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mirzadham/trainingroombookingsystem2.git
   cd trainingroombookingsystem2
   ```

2. **Setup environment & dependencies**:
   ```bash
   composer install
   npm install
   cp .env.example .env
   php artisan key:generate
   ```

3. **Run Database Migrations & Seeders**:
   ```bash
   php artisan migrate --seed
   php artisan storage:link
   ```

4. **Start Development Servers**:
   ```bash
   # Terminal 1 (Backend API)
   php artisan serve

   # Terminal 2 (Vite HMR)
   npm run dev
   ```

---

## 🌿 Git Workflow & Branching Strategy

- **`main` Branch**: Protected. Never push directly to `main`.
- **Feature Branches**: Branch out from `main` using structured prefixes:
  - `feat/short-description` for new capabilities (e.g. `feat/export-calendar`)
  - `fix/short-description` for bug fixes (e.g. `fix/booking-overlap`)
  - `refactor/short-description` for structural improvements
  - `docs/short-description` for documentation updates

### Commit Message Standard (Conventional Commits)
Write clean, explicit commit messages:
- `feat(booking): add recurring schedule validator`
- `fix(auth): handle token expiry gracefully in apiClient`
- `docs(readme): clarify PHP version prerequisite`

---

## 🧪 Testing & Code Quality Assurance

Before submitting a Pull Request, run local verification checks:

1. **Backend Tests**:
   ```bash
   vendor/bin/phpunit
   ```
2. **Laravel Pint Style Check**:
   ```bash
   vendor/bin/pint --test
   ```
3. **Frontend Production Build**:
   ```bash
   npm run build
   ```

---

## 📩 Pull Request Guidelines

1. Open a Pull Request targeting `main`.
2. Provide a clear summary of changes, motivation, and manual test results.
3. Ensure all CI checks (PHPUnit, Pint, Vite Build) pass.
4. Request review from the project maintainer.
