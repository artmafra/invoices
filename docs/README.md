# Documentation Index

This folder collects feature, architecture, and operations docs for the template. Start with README.md in the repo root, then use the sections below to dive deeper.

## Start here

- ENVIRONMENT.md - Required and optional environment variables
- DEPLOYMENT.md - Production deployment steps and checklist
- DATABASE-POOLING.md - Connection pooling configuration and scaling strategies
- MIGRATIONS.md - Database migration workflow
- TESTING.md - Test strategy and suggested coverage

## Architecture and security

- ARCHITECTURE.md - Layers, patterns, and project structure
- AUTH-ARCHITECTURE.md - Auth flows, step-up auth, and security model
- SECURITY-REFACTOR.md - Security hardening plan and status
- ERROR-HANDLING.md - API error patterns and client handling
- LOGGING.md - Structured logging and request tracing
- MONITORING.md - Metrics, alerts, and health checks

## Core systems

- API.md - API endpoint reference
- SETTINGS.md - Settings registry and runtime usage
- PERMISSIONS.md - Permission model and helpers
- SESSIONS.md - Session lifecycle and admin controls
- ACTIVITY.md - Audit log format, integrity, and UI
- TOKENS.md - Unified token system for verification flows
- ENCRYPTION.md - Data-at-rest encryption and key rotation
- RATE-LIMITING.md - Rate limiting configuration and policies
- HTTP-CACHING.md - ETag-based conditional responses
- QUEUE.md - BullMQ background jobs

## Feature guides

- APPS.md - Multi-app registry and module scaffolding
- MULTI-EMAIL.md - Secondary email management
- PASSKEYS.md - WebAuthn/passkey support
- STEP-UP-AUTH.md - Re-authentication for sensitive actions
- PREFERENCES.md - User preferences and persistence
- IMPERSONATION.md - Admin impersonation flow
- STORAGE.md - Google Cloud Storage and image pipeline
- GMAIL.md - Gmail API setup and email sending
- GEOLOCATION.md - IP geolocation on sessions
- I18N.md - Localization structure and usage
- SEARCH-FILTER-BAR.md - Search/filter UI and URL state
- COMMAND-PALETTE.md - Command palette and command registry
- KEYBOARD-SHORTCUTS.md - Shortcut registry and handlers
- MULTI-STEP-TRANSITIONS.md - Multi-step UI container
- UI-PATTERNS.md - Admin UI composition patterns

## Operations

- CI-CD.md - CI/CD pipeline outline
- CRON-JOBS.md - Scheduled maintenance endpoint
- TROUBLESHOOTING.md - Common issues and fixes

## Roadmap

- FUTURE-FEATURES.md - Planned enhancements
