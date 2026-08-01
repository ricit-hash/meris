# Meris

**Range-based data marketplace built on Shelby.**

Meris lets publishers list datasets stored as Shelby blobs and lets buyers inspect a listing, choose a record range, receive a proportional ShelbyUSD quote, fund a micropayment channel, and request only the selected data window.

## Product flow

### Publisher

1. Connect an Aptos wallet.
2. Create a publisher profile.
3. Upload or reference a dataset blob on Shelby.
4. Verify the blob and publish a manifest.
5. Manage listings, payment channels, withdrawals, and delivery state from the publisher workspace.

### Buyer

1. Browse public dataset manifests.
2. Inspect format, license, snapshot information, publisher, record count, and full-listing price.
3. Select the percentage or record range required.
4. Receive a proportional quote with a minimum charge of `1 sUSD` for paid range listings.
5. Fund a ShelbyUSD micropayment channel and request the selected range.
6. Download through a short-lived signed stream URL after funding is verified.

## Architecture

```text
Aptos wallet
    │
    ├── publisher manifest ──> Meris catalog
    │                              │
    │                              └── selected record range
    │                                      │
    ├── Shelby blob storage <──────────────┤
    │                                      │
    └── ShelbyUSD micropayment channel ────┴──> verified range delivery
```

- Dataset bytes remain in Shelby storage.
- Meris stores listing manifests and local operational records server-side.
- Wallet identity is resolved from the connected Aptos wallet.
- Paid range requests use ShelbyUSD micropayment channels.
- Delivery URLs are HMAC-signed, range-bound, and time-limited.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Wallet | Aptos Wallet Standard |
| Chain client | `@aptos-labs/ts-sdk` |
| Storage and payments | `@shelby-protocol/sdk` |
| Testing | Vitest |
| Runtime | Node.js |

## Repository structure

```text
apps/web/        Next.js application, API routes, and UI
backend/         Backend boundary
packages/        Shared package boundaries
```

## Local development

Requirements:

- Node.js 20 or newer
- npm
- An Aptos-compatible wallet such as Petra
- Shelby credentials for live upload, verification, streaming, and payment operations

```bash
npm --prefix apps/web install
cp apps/web/.env.example apps/web/.env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment

See [`apps/web/.env.example`](apps/web/.env.example).

Required for live Shelby operations:

- `SHELBY_API_KEY`
- `SHELBY_ACCOUNT_PRIVATE_KEY`
- `SHELBY_STREAM_SECRET`

Never expose these values to the browser or commit them to Git.

## Commands

```bash
npm run dev        # development server
npm test           # Vitest suite
npm run typecheck  # TypeScript validation
npm run build      # production build
npm run start      # production server
```

Do not run `next build` while `next dev` is using the same workspace because both processes write `.next`.

## Current MVP status

Implemented:

- Aptos wallet gate and session restore
- Publisher profile and workspace
- Shelby blob upload, verification, and range streaming
- Manifest creation, editing, delisting, and catalog discovery
- Proportional range pricing with a `1 sUSD` minimum
- ShelbyUSD micropayment-channel creation, confirmation, and publisher withdrawal flow
- Signed range-delivery URLs
- Landing, marketplace, dataset detail, purchases, and publisher routes

Known external limitation:

- The current public Shelby indexer schema exposes `processor_status` but not the `blobs` query expected by Shelby SDK `0.4.1`. Meris therefore reports account blob-index listing as temporarily unavailable while direct blob upload, verification, manifests, and range delivery remain separate paths.

## Security notes

- Secrets remain server-side.
- Private keys, API keys, `.env*`, generated data, logs, build output, and screenshots are ignored.
- Stream authorization validates signature, expiry, blob path, and byte boundaries.
- Payment and wallet completion are not inferred from client presentation alone.
- This repository is an MVP and has not undergone an independent security audit.

## License

No open-source license has been assigned yet. All rights reserved.
