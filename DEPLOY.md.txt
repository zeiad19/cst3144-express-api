# Deploy (Render)

## 1) Create Web Service
- Build Command: (leave empty)
- Start Command: `npm start`
- Node Version: 18+

## 2) Environment Variables
- PORT: 10000 (Render sets it; Express reads process.env.PORT)
- NODE_ENV: production
- CORS_ORIGIN: https://<your-username>.github.io

## 3) Health Check
- Path: /health
- Should return: {"ok": true, ...}

## 4) Logs
- Use Render logs to verify server started.
- Test endpoints: /lessons, /orders (POST), /lessons/:id (PUT)

## 5) Front-end switch
- In your Vue FE, set API_BASE to the deployed URL:
  e.g. https://<your-service>.onrender.com
