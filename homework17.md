# Homework 17: CI/CD Pipeline

## Goal

The goal of this homework is to implement a complete CI/CD pipeline for the project with:

- pull request validation
- automated build and deployment to `stage`
- manual approval before deployment to `production`
- reuse of the same immutable artifact between `stage` and `production`

## Implemented workflows

### 1. Pull Request checks

Workflow:

- [`.github/workflows/pr-checks.yml`](./.github/workflows/pr-checks.yml)

This workflow is executed for pull requests and performs:

- lint validation
- CI-oriented tests
- Docker build validation

This ensures that only validated changes can be merged.

### 2. Build and deploy to Stage

Workflow:

- [`.github/workflows/build-and-stage.yml`](./.github/workflows/build-and-stage.yml)

Trigger:

- `push` to `develop`

Pipeline steps:

1. checkout repository
2. prepare Docker image metadata
3. build a runtime image from [`Dockerfile`](./Dockerfile)
4. push the image to GitHub Container Registry (`ghcr.io`)
5. create a `release-manifest-<sha>.json`
6. upload deploy artifacts
7. deploy to `stage` using a `self-hosted` runner
8. run a smoke check against Swagger UI

Stage deployment uses:

- [`deploy/compose.stage.yml`](./deploy/compose.stage.yml)
- GitHub Environment `stage`
- secret `STAGE_ENV_FILE`

## Release manifest

The build workflow generates a release manifest that contains:

- commit identifier
- image reference
- image digest
- service mapping

This manifest is used later by the production workflow to guarantee artifact promotion without rebuild.

## Immutable artifact approach

The image is built once in the stage pipeline and then reused later.

Production does not rebuild the application image. Instead, it downloads metadata from the staged release and deploys the same container image by digest.

This approach guarantees that:

- `stage` and `production` use the same artifact
- production deployment is reproducible
- deployment history is traceable by commit and digest

## 3. Deploy to Production

Workflow:

- [`.github/workflows/deploy-prod.yml`](./.github/workflows/deploy-prod.yml)

Trigger:

- `push` to `main`

Pipeline steps:

1. find the latest successful `Build and Stage` run on `develop`
2. download the release manifest from that run
3. download production deploy files
4. resolve image metadata from the manifest
5. wait for manual approval through GitHub Environment `production`
6. pull the same immutable image by digest
7. deploy the production stack
8. run a production smoke check

Production deployment uses:

- [`deploy/compose.prod.yml`](./deploy/compose.prod.yml)
- GitHub Environment `production`
- secret `PRODUCTION_ENV_FILE`

## Self-hosted runner

Deploy jobs are executed on a `self-hosted` GitHub Actions runner.

This is necessary because:

- GitHub-hosted runners are temporary
- stage and production services must continue running after the workflow ends
- Docker Compose deployment requires access to the host Docker engine

## Cross-platform adjustments

The deploy workflows were adjusted to avoid unnecessary operating system coupling:

- metadata parsing and env-file writing use `actions/github-script`
- smoke checks use `actions/github-script`
- only Docker CLI steps remain shell-specific
- Docker CLI steps are split for Windows and Linux/macOS runners using `runner.os`

This makes the deploy logic more portable across different self-hosted runner environments.

## Result

The project now has a complete CI/CD flow:

- PR validation before merge
- automatic build and deploy to `stage`
- manual approval before `production`
- promotion of the same immutable artifact from `stage` to `production`

This satisfies the core CI/CD requirements of the homework and demonstrates a production-like delivery process using GitHub Actions, GHCR, Docker Compose, GitHub Environments, and a self-hosted runner.
