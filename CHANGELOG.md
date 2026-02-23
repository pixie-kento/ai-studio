# Changelog

All notable changes to this repository will be documented in this file.

## [Unreleased]

### Added
- Initial full-stack StudioAI monorepo with:
- Express API (`apps/api`) for auth, workspace CRUD, shows, characters, scenes, episodes, pipeline, review, webhooks, and admin endpoints.
- React web app (`apps/web`) with onboarding, dashboard, show/character/episode flows, pipeline monitoring, review views, watch pages, and superadmin pages.
- PocketBase schema/migrations and plan seed data under `pocketbase/`.
- FastAPI render bridge (`render-server`) with ComfyUI + ffmpeg pipeline scaffold.
- Docker compose files for local and production-style deployments.

### Changed
- Professional UI redesign across the app:
- refreshed design tokens, typography, hover interactions, and dark/light mode handling.
- redesigned public pages (landing, pricing, login, register, forgot password).
- upgraded dashboard, shows, characters, episodes, and pipeline views for better responsiveness and interaction.

### Fixed
- Defensive handling for list-based screens to avoid runtime errors when API responses are empty or malformed.
- Improved rendering/list behavior to avoid hard crashes in episode/show list pages when data is undefined.

### Documentation
- Replaced root `README.md` with an updated setup and architecture guide.
- Updated `render-server/README.md` with current environment variables, run instructions, callback contract, and limitations.
- Added this `CHANGELOG.md`.
