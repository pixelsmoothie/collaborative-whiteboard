# Collaborative Whiteboard

Real-time multiplayer drawing board. Spring Boot WebSocket backend broadcasts
draw events between browsers; React canvas renders them. Boards can be
snapshotted to S3 and served back through CloudFront.

## Architecture

<img width="1200" height="760" alt="image" src="https://github.com/user-attachments/assets/96701c63-9602-4da8-b02f-5b1e1ccbec7d" />

## Run locally

**Backend** (Java 17 + Maven):

```bash
cd backend
mvn spring-boot:run
```

Runs on `http://localhost:8080`. WebSocket endpoint: `ws://localhost:8080/ws/board`.

**Frontend** (Node 18+):

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL in two browser windows and draw —
strokes sync instantly between them.

## Save-to-S3 (optional, needs AWS)

1. Create an S3 bucket, set `aws.s3.bucket` in
   `backend/src/main/resources/application.properties`.
2. Provide AWS credentials to the backend process (env vars
   `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, or an IAM role if deployed
   on AWS — `DefaultAWSCredentialsProviderChain` picks either up automatically).
3. Click **Save Board** in the UI. The backend uploads a PNG to
   `boards/<uuid>.png` and returns its URL.

## CloudFront (optional)

1. In the AWS Console, create a CloudFront distribution pointing at the S3
   bucket (as an S3 origin, or the bucket's static-website endpoint).
2. Set `aws.cloudfront.domain` (backend) to the distribution's domain, e.g.
   `d111111abcdef8.cloudfront.net`. Saved board URLs will then resolve through
   the CDN instead of hitting S3/the backend directly.

## Deploy

**Backend → AWS App Runner**

```bash
cd backend
docker build -t whiteboard-backend .
```

Push the repo to GitHub, then in the AWS Console create an App Runner service
from that repo (or the built image) — it redeploys automatically on every
push once connected.

**Frontend** — build with `npm run build` in `frontend/` and host the
`dist/` output anywhere static (S3 + CloudFront, Vercel, Netlify). Point
`VITE_API_URL` / `VITE_WS_URL` at the deployed backend's App Runner URL
(use `wss://` once it's served over HTTPS).

## Project layout

```
whiteboard/
├── backend/    Spring Boot app (WebSocket relay + S3 upload API)
└── frontend/   React + Vite + Tailwind canvas client
```
