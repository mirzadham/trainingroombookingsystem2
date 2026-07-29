# MIMOS Academy - Training Room Booking System

![Laravel](https://img.shields.io/badge/Laravel-11.x-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.0-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)

A premium, Airbnb-inspired single-page application (SPA) for booking training rooms. Built to serve MIMOS Academy, this system provides an elegant visual search experience, interactive availability timelines, and a robust administrative dashboard to manage bookings efficiently.

---

## ✨ Key Features

- **Visual Search Experience**: A stunning, responsive grid layout showcasing available training rooms with high-quality imagery and essential details.
- **Interactive Booking Drawer**: A seamless side-sheet interface that slides in to display room specifications, dynamic availability timelines, and a multi-step booking process.
- **Modern Authentication Flow**: Clean, split-screen login interfaces for both standard users and administrators, strictly adhering to the MIMOS Academy visual identity.
- **Admin Dashboard**: A comprehensive management portal for administrators to oversee room inventory, monitor bookings, handle approvals, and generate system reports.
- **Role-Based Access Control (RBAC)**: Secure separation of concerns between public users and administrators, powered by Laravel Sanctum API authentication.

## 🛠 Tech Stack

### Backend
- **Framework**: [Laravel 11.x](https://laravel.com/) (PHP 8.3+)
- **Authentication**: Laravel Sanctum (Token-based API Authentication)
- **Database**: MySQL (Configured via Laravel Eloquent ORM)

### Frontend
- **Library**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS v4 + Tailwind Merge
- **State/Data Fetching**: TanStack React Query
- **Icons**: Lucide React
- **Date Utilities**: Date-fns

## 🚀 Getting Started

> **🆕 Full Collaborator Setup Guide**:  
> For complete step-by-step instructions, seeded user credentials, testing commands, and troubleshooting, please read our dedicated [**Developer Setup Guide**](docs/SETUP_GUIDE.md).

Follow these steps to set up the project locally for development.

### Prerequisites
- PHP >= 8.3
- Composer
- Node.js >= 18.x & npm
- MySQL Server (or Laragon/XAMPP)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mirzadham/trainingroombookingsystem2.git
   cd trainingroombookingsystem2
   ```

2. **Install Backend Dependencies**
   ```bash
   composer install
   ```

3. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

4. **Environment Setup**
   Copy the example `.env` file and generate a new application key.
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
   *Update the `.env` file with your local database credentials.*

5. **Database Migration & Seeding**
   Run the migrations to create the database tables and seed them with initial data (users, rooms, locations, etc.).
   ```bash
   php artisan migrate --seed
   ```

6. **Storage Link**
   Create a symbolic link for the storage directory to serve public assets (like room images).
   ```bash
   php artisan storage:link
   ```

## 💻 Development

This project uses Laravel's Vite integration for a seamless developer experience. To start the local development server, you will need to run both the backend server and the Vite frontend build process.

1. **Start the Laravel Development Server**
   ```bash
   php artisan serve
   ```

2. **Start the Vite Development Server** (in a separate terminal)
   ```bash
   npm run dev
   ```

Alternatively, if you are using **Laragon**, you can access the application via your configured local domain (e.g., `http://trainingroombookingsystem2.test`) and only need to run `npm run dev` to enable Hot Module Replacement (HMR) for React components.

## 🗂 Project Structure

- `app/` - Laravel backend models, controllers, and services.
- `resources/js/` - React SPA frontend application.
  - `components/` - Reusable UI components (e.g., RoomDrawer, TimelineGrid).
  - `pages/` - Main route components (Home, SearchResults, Login, Dashboard).
  - `layouts/` - Shared page layouts (PublicLayout, AdminLayout).
  - `services/` - Axios API integration layer.
- `routes/` - API and web route definitions.
- `database/` - Migrations, factories, and seeders.

## 🎨 Design System

The application strictly follows the MIMOS Academy visual guidelines, emphasizing:
- **Vibrant & Dark Mode Aesthetics**: Smooth gradients, sleek dark panels, and high-contrast forms.
- **Glassmorphism**: Subtle transluscent backgrounds on interactive overlays.
- **Micro-animations**: Smooth hover effects and drawer sliding transitions to enhance user engagement.

## 📄 License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT). This specific application's proprietary code and design assets belong to MIMOS Academy.