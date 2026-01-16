
## Description

This project is a **training backend application** built with **NestJS**.  
The main goal of the project is to demonstrate a clean, well-structured, and scalable backend architecture that follows modern industry best practices.

# 📘 Table of Contents

- [Architectural Vision](#project-architecture)
- [Requirements](#requirements)
- [Project setup](#project-setup)
- [Environment Variables](#environment-variables)
- [Compile and run the project](#compile-and-run-the-project)
- [Run tests](#run-tests)
- [Deployment](#deployment)
- [Tests](#run-tests)
- [Stay in touch](#stay-in-touch)
- [License](#license)

## Architectural Vision

The architecture is designed with a focus on:
- modularity
- clear separation of responsibilities
- centralized and typed configuration
- maintainability and future scalability

---

## Overall Architecture

The application follows a **modular architecture**.

Each major business domain is implemented as an isolated module:
- `users`
- `products`
- `orders`
- `payments`
- `auth`
- `profiles`
- `notifications`
- `reportings`

This design allows each domain to evolve independently while maintaining clear boundaries between different areas of responsibility.

---

## Project Structure

```text
src/
 ├─ auth/
 ├─ users/
 ├─ orders/
 ├─ payments/
 ├─ products/
 ├─ profiles/
 ├─ notifications/
 ├─ reportings/
 ├─ config/
 ├─ app.module.ts
 └─ main.ts

test/
 └─ app.e2e-spec.ts
```

### Structure explanation
### Domain modules
Each domain module encapsulates its own business logic and typically contains controllers, services, DTOs, and entities.
This follows the Single Responsibility Principle and improves readability and maintainability. 

---

**Core domain modules include**: `users`, `products`, `orders`, `payments`

**Isolated modules include**: `auth`, `profiles`, `notifications`, and `reportings`.

**Configuration layer**: The `config` directory contains centralized and strongly typed application configuration, separated to custom configuration files.

---

## Requirements

- Node.js v22.14.0
- npm (comes with Node.js)
- it is possible to set Node.js version saved for the project
```bash
$ nvm use
```

## Project setup

```bash
$ npm install
```

## Environment Variables

Create *(or rename `.env.example`)*   `.env` file for production  or `.env.development.local` for development in the root directory and add the necessary environment variables.
Here is an example of the required environment variables:

```env
# Application Port
PORT=3001

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=db-user
DATABASE_PASSWORD=db-password
DATABASE_NAME=db-name
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment


## Stay in touch

- Author - [Oleksii Bielikov](https://www.linkedin.com/in/oleksii-bielikov/)


## License

MIT licensed.
