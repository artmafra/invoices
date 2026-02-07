# Google Cloud Storage

Cloud storage for images and avatars with an image proxy endpoint.

## Required env vars

- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_CLOUD_STORAGE_BUCKET`
- `GOOGLE_CLOUD_CREDENTIALS` (service account JSON)

## Image proxy

- Images are served via `GET /api/storage/<key>`.
- URLs returned by the storage service are already proxied.

## Upload constraints

- Allowed formats: JPEG, PNG, GIF, WebP
- SVGs are rejected
- Max dimension: 4096px
- Max total pixels: 50MP

## Avatars

Profile pictures are resized and stored in multiple sizes:

- sm: 64x64
- md: 128x128
- lg: 256x256

## Key files

- `src/services/cloud-storage.service.ts`
- `src/app/api/storage/[...key]/route.ts`
- `src/app/api/profile/avatar/route.ts`

## Test

```bash
npm run test:storage
```
