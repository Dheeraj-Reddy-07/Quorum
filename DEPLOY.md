# Deploying Quorum to Railway

## Project Overview
Quorum is a **TanStack Start** application with SSR capabilities, built with Vite, React, TypeScript, and Supabase as the backend.

## Prerequisites
- Railway account: https://railway.app
- Railway CLI: `npm install -g @railway/cli`
- Git repository pushed to GitHub

## Step 1: Prepare Your Repository
```bash
git add .
git commit -m "feat: Ready for Railway deployment"
git push origin main
```

## Step 2: Create Railway Project
1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select your repository
4. Choose **"Node.js"** as the service type

## Step 3: Configure Environment Variables
In Railway → your service → **Variables**, add these from your `.env` file:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://gbzpcqduqlygbwshpsjn.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdienBjcWR1cWx5Z2J3c2hwc2puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzMwNDIsImV4cCI6MjA5MzcwOTA0Mn0.1Tas9PEoojrXDD9ufkD6k5dJipVLCEKaKwq0hDRRp_Y` |

## Step 4: Configure Build & Start Commands
In Railway → your service → **Settings**:

- **Build command**: `npm install && npm run build`
- **Start command**: `node .output/server/index.js`

> **Note**: TanStack Start outputs to `.output/server/index.js` for Node.js deployment

## Step 5: Node.js Version
Ensure Railway uses Node.js 18+:
- In **Settings** → **Build** → **Node Version**: Set to `18` or `20`

## Step 6: Deploy
Railway will automatically deploy when you push to your main branch, or you can trigger a manual deploy from the Railway dashboard.

## Alternative Deployment Options

### Option A: Vercel (Recommended for TanStack Start)
```bash
npm install -g vercel
vercel --prod
```
Add the same environment variables in Vercel dashboard.

### Option B: Static Export (If you disable SSR)
If you want to deploy as a static site, modify `vite.config.ts`:
```ts
export default defineConfig({
  plugins: [
    tanstackStart({
      target: "static", // Change from "node"
    }),
    // ... rest of config
  ],
});
```

Then use Railway's **Static Site** service or any static hosting provider.

## Post-Deployment Configuration

### Update Supabase Auth Settings
After deployment, update your Supabase project's **Authentication → URL Configuration**:
- **Site URL**: `https://your-app-name.up.railway.app`
- **Redirect URLs**: `https://your-app-name.up.railway.app/**`
- **Additional Redirect URLs**: Add your local development URL (`http://localhost:5173`)

### Verify Deployment
1. Check the Railway logs for any build errors
2. Test authentication flow
3. Verify database connectivity
4. Check that all routes are working correctly

## Troubleshooting

### Common Issues
- **Build fails**: Check that all dependencies are in `package.json`
- **Runtime errors**: Verify environment variables are correctly set
- **Auth issues**: Ensure Supabase redirect URLs match your Railway domain
- **SSR issues**: Check that `target: "node"` is set in `vite.config.ts`

### Railway-Specific Tips
- Railway automatically assigns a `$PORT` environment variable
- Use the Railway logs to debug deployment issues
- Enable auto-deploys for seamless CI/CD
- Consider using Railway's preview deployments for pull requests

## Production Checklist
- [ ] Environment variables configured
- [ ] Supabase auth URLs updated
- [ ] Build process successful
- [ ] All routes accessible
- [ ] Authentication working
- [ ] Database operations functional
- [ ] Error monitoring set up (optional)
