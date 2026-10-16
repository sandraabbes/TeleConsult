# Teleconsultation Platform

This repository contains the full teleconsultation application, including a React frontend and a NestJS microservices backend.

## Overview

The project is split into two main parts:

- `teleconsultation-frontend/` — Vite + React + TypeScript client application
- `TEM-DDC/` — backend microservices built with NestJS, API gateway, and related services

This is a healthcare-oriented platform with patient/doctor flows, appointments, messaging, notifications, AI support, and video consultation components.

## Architecture

- Frontend: React app served by Vite
- Backend: multiple NestJS microservices under `TEM-DDC/`
- Gateway: `TEM-DDC/api-gateway`
- Shared service modules include:
  - `ms-loginpatient`
  - `ms-logindoctor`
  - `ms-doctors`
  - `ms-patients`
  - `ms-rendez-vous`
  - `ms-video-consultation`
  - `ms-notifications`
  - `ms-messages`
  - `ms-ai`
  - `ms-payments`
  - `ms-availability` / `ms-disponibility`
  - `ms-medical-records`

## Prerequisites

Before running the app, make sure you have installed:

- Node.js 18+ or 20+
- npm
- Git
- Optional: PostgreSQL / Redis / message broker services depending on the microservice setup

## Repository setup

### 1) Install frontend dependencies

```bash
cd teleconsultation-frontend
npm install
```

### 2) Install backend dependencies

```bash
cd TEM-DDC
npm install
```

## Run the app

### Start the frontend

```bash
cd teleconsultation-frontend
npm run dev
```

### Start the backend microservices

From the root of `TEM-DDC`:

```bash
npm run start:all
```

You can also start a single service manually, for example:

```bash
cd TEM-DDC
npm run start:gateway
npm run start:doctors
npm run start:loginpatient
```

## Production build

### Frontend

```bash
cd teleconsultation-frontend
npm run build
```

### Backend services

Each microservice exposes its own NestJS scripts. Typical usage:

```bash
cd TEM-DDC/api-gateway
npm run build
```

