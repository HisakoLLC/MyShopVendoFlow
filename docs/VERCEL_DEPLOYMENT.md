# Vercel Deployment Guide

Step-by-step guide to deploy VendoFlow to Vercel.

## Quick Start

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for production"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel auto-detects Next.js

3. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.example`

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

## Detailed Steps

### 1. Prepare Repository

Ensure your code is ready:
- [ ] All code committed
- [ ] `.env.local` is in `.gitignore`
- [ ] No hardcoded secrets
- [ ] Build passes locally (`npm run build`)

### 2. Create Vercel Project

1. Sign in to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will detect:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 3. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

#### Supabase Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### App URL
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```
**Important**: After first deployment, update this to your actual Vercel URL.

#### M-Pesa Variables (Optional)
```
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=your_shortcode
MPESA_ENVIRONMENT=sandbox
```

### 4. Deploy

1. Click "Deploy" button
2. Wait for build to complete (2-5 minutes)
3. Your app will be live at `https://your-app.vercel.app`

### 5. Post-Deployment Configuration

#### Update Supabase Settings

1. **Auth Redirect URLs:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add: `https://your-app.vercel.app/**`

2. **M-Pesa Callback URL:**
   - Update callback URL in your M-Pesa app settings
   - New URL: `https://your-app.vercel.app/api/mpesa/callback`

3. **Storage CORS:**
   - Go to Storage → Settings
   - Add your Vercel domain to allowed origins

#### Update Environment Variables

After first deployment, update `NEXT_PUBLIC_APP_URL`:
1. Go to Vercel → Settings → Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` to your actual Vercel URL
3. Redeploy (or it will update on next deployment)

### 6. Custom Domain (Optional)

1. Go to Vercel → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

## Environment Variables Reference

### Required Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Service role key (secret) |
| `NEXT_PUBLIC_APP_URL` | `https://app.vercel.app` | Your app's public URL |

### Optional Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `MPESA_CONSUMER_KEY` | `xxx` | M-Pesa consumer key |
| `MPESA_CONSUMER_SECRET` | `xxx` | M-Pesa consumer secret |
| `MPESA_PASSKEY` | `xxx` | M-Pesa passkey |
| `MPESA_SHORTCODE` | `174379` | M-Pesa shortcode |
| `MPESA_ENVIRONMENT` | `sandbox` | `sandbox` or `production` |

## Build Configuration

Vercel automatically detects Next.js and uses:
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node Version**: 18.x (auto-detected)

## Deployment Settings

### Regions

Vercel deploys to the closest region automatically. You can specify in `vercel.json`:
```json
{
  "regions": ["iad1"]  // US East
}
```

### Build Settings

No special configuration needed. Vercel handles:
- Next.js optimization
- Image optimization
- Static file serving
- API routes

## Monitoring

### Vercel Analytics

1. Go to Project → Analytics
2. Enable Vercel Analytics (optional)
3. View real-time metrics

### Logs

1. Go to Project → Deployments
2. Click on a deployment
3. View build logs and runtime logs

### Error Tracking

Consider integrating:
- Sentry (for error tracking)
- LogRocket (for session replay)
- Vercel Analytics (built-in)

## Troubleshooting

### Build Fails

**Common causes:**
- Missing environment variables
- TypeScript errors
- Missing dependencies

**Solution:**
1. Check build logs in Vercel
2. Fix errors locally first
3. Ensure all env vars are set

### Runtime Errors

**Common causes:**
- Incorrect environment variables
- Supabase connection issues
- Missing database setup

**Solution:**
1. Check function logs in Vercel
2. Verify Supabase connection
3. Check database is set up correctly

### M-Pesa Callbacks Not Working

**Common causes:**
- Incorrect callback URL
- CORS issues
- Network timeout

**Solution:**
1. Verify `NEXT_PUBLIC_APP_URL` is correct
2. Check Supabase logs
3. Test callback endpoint manually

## CI/CD

Vercel automatically:
- Deploys on every push to `main`
- Creates preview deployments for PRs
- Runs builds in parallel
- Caches dependencies

### Branch Strategy

- `main` → Production
- `develop` → Preview (optional)
- Feature branches → Preview deployments

## Performance Optimization

Vercel automatically:
- Optimizes images
- Code splits
- Caches static assets
- Uses CDN for global distribution

### Manual Optimizations

1. **Image Optimization:**
   - Use Next.js Image component
   - Optimize image sizes before upload

2. **Code Splitting:**
   - Use dynamic imports for heavy components
   - Lazy load modals and dialogs

3. **Caching:**
   - API routes are cached by default
   - Use `revalidate` for ISR where appropriate

## Security

### Environment Variables

- Never commit `.env.local`
- Use Vercel's environment variables
- Rotate secrets regularly
- Use different keys for staging/production

### Headers

Security headers are configured in `next.config.mjs`:
- X-Content-Type-Options
- Referrer-Policy
- X-Frame-Options
- Permissions-Policy

## Rollback

To rollback to a previous deployment:

1. Go to Project → Deployments
2. Find the deployment you want
3. Click "..." → "Promote to Production"

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Support](https://vercel.com/support)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Ready to deploy?** Follow the Quick Start section above!
