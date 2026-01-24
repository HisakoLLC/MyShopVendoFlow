# Production Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

## Pre-Deployment

### 1. Code Preparation
- [ ] All code committed to Git
- [ ] No console.log statements in production code
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Responsive design tested

### 2. Environment Variables
- [ ] `.env.example` file created
- [ ] All required variables documented
- [ ] No secrets committed to Git
- [ ] `.env.local` in `.gitignore`

### 3. Database Setup
- [ ] Supabase project created
- [ ] All SQL scripts executed in order:
  - [ ] `sql/SETUP_ALL_RLS.sql`
  - [ ] `sql/FIX_GET_ACCOUNT_ID.sql`
  - [ ] `sql/FIX_PLAN_TIER.sql`
  - [ ] `scripts/ADD_HAS_DEMO_DATA_COLUMN.sql`
  - [ ] `CREATE_PENDING_MPESA_PAYMENTS_TABLE.sql`
- [ ] Storage buckets created:
  - [ ] `product-images` (public)
  - [ ] `business-logos` (public)
- [ ] Edge Function deployed:
  - [ ] `calculate-metrics` function deployed
  - [ ] Function scheduled (daily at 2 AM UTC)

### 4. Supabase Configuration
- [ ] Auth redirect URLs configured
- [ ] CORS settings updated
- [ ] RLS policies verified
- [ ] Service role key secured

## Vercel Deployment

### 1. Project Setup
- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Project imported to Vercel

### 2. Environment Variables
Add all variables in Vercel Dashboard → Settings → Environment Variables:

**Required:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL` (set to your Vercel URL)

**Optional (M-Pesa):**
- [ ] `MPESA_CONSUMER_KEY`
- [ ] `MPESA_CONSUMER_SECRET`
- [ ] `MPESA_PASSKEY`
- [ ] `MPESA_SHORTCODE`
- [ ] `MPESA_ENVIRONMENT` (set to `sandbox` initially)

### 3. Build Configuration
- [ ] Framework preset: Next.js (auto-detected)
- [ ] Build command: `npm run build` (default)
- [ ] Output directory: `.next` (default)
- [ ] Install command: `npm install` (default)

### 4. Domain Configuration
- [ ] Custom domain added (optional)
- [ ] SSL certificate verified (automatic)
- [ ] DNS records configured (if custom domain)

## Post-Deployment

### 1. Update Supabase Settings
- [ ] Update M-Pesa callback URL to production
- [ ] Add production URL to Auth redirect URLs
- [ ] Update CORS to allow production domain

### 2. Testing
- [ ] Test user signup
- [ ] Test login
- [ ] Test account setup
- [ ] Test product creation
- [ ] Test POS checkout
- [ ] Test M-Pesa payment (sandbox)
- [ ] Test dashboard
- [ ] Test all major features

### 3. Monitoring
- [ ] Set up Vercel Analytics (optional)
- [ ] Monitor Supabase logs
- [ ] Check error rates
- [ ] Monitor performance

### 4. Security
- [ ] Verify HTTPS is enabled
- [ ] Check security headers
- [ ] Verify environment variables are not exposed
- [ ] Test authentication flow
- [ ] Verify RLS is working

## Production Readiness

### Performance
- [ ] Page load times acceptable
- [ ] Images optimized
- [ ] Code splitting working
- [ ] API responses fast

### Functionality
- [ ] All features working
- [ ] No console errors
- [ ] Forms submit correctly
- [ ] Payments process correctly
- [ ] Data persists correctly

### User Experience
- [ ] Responsive on all devices
- [ ] Loading states show
- [ ] Error messages clear
- [ ] Navigation works
- [ ] Touch targets adequate

## Rollback Plan

If deployment fails:
1. Check Vercel deployment logs
2. Verify environment variables
3. Check Supabase connection
4. Review error messages
5. Fix issues and redeploy

## Maintenance

### Regular Tasks
- [ ] Monitor error logs weekly
- [ ] Update dependencies monthly
- [ ] Review security quarterly
- [ ] Backup database regularly
- [ ] Test M-Pesa integration monthly

### Updates
- [ ] Test locally first
- [ ] Deploy to preview branch
- [ ] Test preview deployment
- [ ] Merge to main
- [ ] Monitor production deployment

---

**Last Updated**: [Date]
**Deployed By**: [Name]
**Deployment Date**: [Date]
