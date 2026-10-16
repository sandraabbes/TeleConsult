# Teleconsultation Platform

This repository contains a complete teleconsultation platform designed for digital healthcare services. The system combines a modern React frontend with a distributed NestJS microservices backend to support patient-doctor communication, appointment management, medical data handling, AI-powered support, and online consultation workflows.

## Overview

The project is split into two main parts:

- `teleconsultation-frontend/` — Vite + React + TypeScript client application used by patients and healthcare professionals
- `TEM-DDC/` — NestJS-based backend composed of multiple microservices, including the API gateway and domain-specific services

The platform is built around a healthcare workflow where patients can search for doctors, book consultations, manage their records, and communicate securely, while doctors can manage their schedules, availability, profiles, and patient interactions.

## What the platform includes

The application covers several core features:

- Patient authentication and account management
- Doctor authentication and provider profile management
- Doctor search and selection by specialty or availability
- Appointment booking and scheduling
- Doctor availability management
- Real-time messaging between users
- Notifications for updates and alerts
- Medical record access and document handling
- AI-assisted healthcare features and support services
- Video consultation integration for remote sessions
- Payment flow support for consultation services
- Secure API gateway for routing requests across services

## Architecture

- Frontend: React app served by Vite
- Backend: multiple NestJS microservices under `TEM-DDC/`
- Gateway: `TEM-DDC/api-gateway`
- Shared service modules include:
  - `ms-loginpatient` — patient login and authentication
  - `ms-logindoctor` — doctor identity and authentication logic
  - `ms-doctors` — doctor profile and doctor-related data management
  - `ms-patients` — patient management and account features
  - `ms-rendez-vous` — appointment and consultation scheduling
  - `ms-video-consultation` — remote consultation and video service logic
  - `ms-notifications` — system notifications and alert handling
  - `ms-messages` — chat and communication features
  - `ms-ai` — AI-powered support or processing workflows
  - `ms-payments` — billing and payment processing
  - `ms-availability` / `ms-disponibility` — scheduling and availability services
  - `ms-medical-records` — medical file and records management

## Use case

This platform is intended to support a digital care experience where:

- patients can find and contact doctors,
- healthcare professionals can manage their schedules and patient interactions,
- appointments can be booked online,
- medical information can be viewed and updated in a structured way,
- communication and notifications help keep the process organized,
- remote consultation tools reduce friction in healthcare delivery.

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

