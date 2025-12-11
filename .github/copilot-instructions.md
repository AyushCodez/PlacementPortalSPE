# Copilot Instructions for SPE-Project

This repository contains a Placement Test Management System with a dual architecture: a feature-complete Monolith and a Work-In-Progress (WIP) Microservices migration.

## 🏗 Project Architecture

### 1. Monolith (Primary)
- **Location**: `server/`
- **Stack**: Node.js, Express, MongoDB (Mongoose).
- **Status**: **Source of Truth**. Contains all current business logic and features.
- **Structure**:
  - `controllers/`: Business logic.
  - `models/`: Mongoose schemas.
  - `routes/`: API route definitions.
  - `middleware/`: Auth and validation.
  - `utils/`: Helpers (mailer, etc.).

### 2. Microservices (WIP Migration)
- **Location**: `services/`
- **Stack**: Dockerized Node.js services.
- **Status**: **Incomplete/Experimental**. Missing features compared to `server/`.
- **Services**: `auth-service`, `campaign-service`, `assessment-service`, `student-service`, `dashboard-service`, `gateway`.
- **Orchestration**: `docker-compose.yml` and `k8s/` (Kubernetes manifests).

### 3. Frontend
- **Location**: `client/`
- **Stack**: React (Create React App).
- **State Management**: Context API (`src/context/AuthContext.js`).
- **Routing**: `react-router-dom`.
- **API**: Axios with `process.env.REACT_APP_API_URL`.

## 🚀 Development Workflows

### Running Locally (Monolith - Recommended)
1.  **Database**: Ensure MongoDB is running.
2.  **Server**:
    ```bash
    cd server
    npm install
    npm start
    ```
    Runs on port defined in `.env` (default 5001).
3.  **Client**:
    ```bash
    cd client
    npm install
    npm start
    ```
    Runs on `http://localhost:3000`.

### Running Microservices (Docker)
-   Use `docker-compose up --build` to run the microservices stack.
-   **Note**: This may not have full feature parity with the monolith.

## 🧩 Key Conventions & Patterns

-   **API Routes**:
    -   Monolith routes are in `server/routes/*.js`.
    -   Frontend API calls use `axios` and are often wrapped in Context or Component logic.
-   **Authentication**:
    -   JWT-based auth.
    -   Middleware: `server/middleware/authMiddleware.js`.
    -   Frontend handles tokens in `AuthContext.js` and `localStorage`.
-   **Role-Based Access Control (RBAC)**:
    -   Roles: `admin`, `master`, `volunteer`.
    -   Frontend `PrivateRoute` component handles role checks (`client/src/App.js`).
-   **Database Models**:
    -   Defined in `server/models/`.
    -   Key models: `User`, `Student`, `Campaign`, `Test`, `Volunteer`.

## ⚠️ Important Notes for AI Agents

1.  **Code Reference**: When asked to implement features or fix bugs, **default to `server/`** unless explicitly asked to work on the microservices migration.
2.  **Migration Awareness**: Be aware that `services/` code might be outdated or missing features present in `server/`. Always cross-reference `server/` logic when working on `services/`.
3.  **Kubernetes**: The `k8s/` folder contains manifests, but some (like `backend.yaml`) may be empty or placeholders. Verify content before referencing.
4.  **Environment Variables**: Both client and server rely heavily on `.env` files. Remind the user to check them if connection issues arise.
