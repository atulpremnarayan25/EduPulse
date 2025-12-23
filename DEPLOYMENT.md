# Deployment Instructions

## Prerequisites
- GitHub account
- Vercel account (free)
- Render.com account (free)
- MongoDB Atlas account (free)
- LiveKit account (free)

## Quick Deployment Guide

### Step 1: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** edupulse-backend
   - **Root Directory:** `backend`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

5. Add Environment Variables (in Render dashboard):
   ```
   MONGO_URI=<your-mongodb-atlas-connection-string>
   JWT_SECRET=<generate-random-string>
   LIVEKIT_API_KEY=<from-livekit-dashboard>
   LIVEKIT_API_SECRET=<from-livekit-dashboard>
   LIVEKIT_URL=wss://<your-project>.livekit.cloud
   CLIENT_URL=https://<your-app>.vercel.app
   PORT=5001
   NODE_ENV=production
   ```

6. Click "Create Web Service"
7. Wait for deployment (~5 minutes)
8. **Copy your backend URL** (e.g., `https://edupulse-backend.onrender.com`)

### Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. Add Environment Variables (in Vercel dashboard):
   ```
   VITE_API_URL=https://edupulse-backend.onrender.com
   VITE_SOCKET_URL=https://edupulse-backend.onrender.com
   ```
   *(Replace with your actual backend URL from Step 1)*

6. Click "Deploy"
7. Wait for build (~2 minutes)
8. **Copy your frontend URL** (e.g., `https://edupulse.vercel.app`)

### Step 3: Update Backend CORS

1. Go back to Render dashboard
2. Go to your backend service → Environment
3. Update `CLIENT_URL` to your Vercel URL:
   ```
   CLIENT_URL=https://edupulse.vercel.app
   ```
4. Save (this will trigger a redeploy)

### Step 4: Set Up MongoDB Atlas

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user
4. Network Access → Add IP: `0.0.0.0/0` (allow from anywhere)
5. Get connection string
6. Add to Render environment variables as `MONGO_URI`

### Step 5: Set Up LiveKit

1. Go to [livekit.io](https://livekit.io)
2. Create free account
3. Create project
4. Get API credentials (Key, Secret, URL)
5. Add to Render environment variables

## Testing Your Deployment

1. Visit your Vercel URL
2. Register a teacher and student account
3. Test full flow:
   - Teacher creates class
   - Teacher joins class
   - Student joins class
   - Test video/audio
   - Test attention checks
   - Test chat

## Troubleshooting

### CORS Errors
- Verify `CLIENT_URL` matches exactly (no trailing slash)
- Check Render logs for CORS messages
- Ensure frontend is using HTTPS URLs

### Socket.IO Not Connecting
- Check browser console for WebSocket errors
- Verify `VITE_SOCKET_URL` is correct
- Check Render logs for connection attempts

### MongoDB Connection Failed
- Verify connection string format
- Check IP whitelist includes `0.0.0.0/0`
- Test connection string locally first

## Files Created

- ✅ `frontend/vercel.json` - Vercel configuration
- ✅ `backend/render.yaml` - Render configuration
- ✅ `frontend/.env.production.template` - Frontend env template
- ✅ `backend/.env.production.template` - Backend env template
- ✅ Updated `backend/server.js` - CORS for Vercel
- ✅ This deployment guide

## Next Steps

1. Push all changes to GitHub
2. Follow deployment steps above
3. Test thoroughly
4. Update README with live URLs
5. Share with users!

## Free Tier Limitations

- **Render:** Service sleeps after 15 minutes of inactivity
- **Vercel:** 100GB bandwidth/month
- **MongoDB Atlas:** 512MB storage
- **LiveKit:** 10,000 minutes/month

For production with high traffic, consider upgrading to paid tiers.
