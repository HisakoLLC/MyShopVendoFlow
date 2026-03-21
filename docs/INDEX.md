# Documentation Index

Quick reference guide to all VendoFlow documentation.

## 🚀 Getting Started

1. **[Environment Variables](../ENV_TEMPLATE.md)** (in root) - Copy to create `.env.local`
2. **[Database Setup Guide](./DATABASE_SETUP.md)** - Complete database setup
3. **[Supabase Setup Guide](./SUPABASE_SETUP.md)** - Supabase-specific configuration

## 📦 Deployment

- **[Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)** - Step-by-step Vercel deployment
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Pre-deployment checklist
- **[Pre-Launch Checklist](./PRE_LAUNCH_CHECKLIST.md)** - Final checks before going live

## 🔧 Troubleshooting

### Common Errors

- **[Invalid API Key](./FIX_INVALID_API_KEY.md)** - "Invalid API key" during signup
- **[Account Not Created](./FIX_ACCOUNT_CREATION_NOW.md)** - Account missing after signup
- **[Onboarding Errors](./QUICK_FIX_ONBOARDING_ERROR.md)** - Permission denied during onboarding
- **[Troubleshoot Signup](./TROUBLESHOOT_SIGNUP.md)** - General signup issues
- **[Complete Fix Guide](./COMPLETE_FIX_GUIDE.md)** - Fix all RLS and permission issues

### Quick Fixes

**"Permission denied" everywhere:**
→ Run `sql/FIX_ALL_RLS_ISSUES.sql` in Supabase SQL Editor

**"Invalid API key" error:**
→ Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and restart dev server

**Account not created:**
→ Check service role key + run `sql/FIX_ALL_RLS_ISSUES.sql`

## 📚 Development Guides

- **[Error Handling Guide](./ERROR_HANDLING_GUIDE.md)** - Error handling patterns
- **[Responsive Design Guide](./RESPONSIVE_DESIGN_GUIDE.md)** - Responsive design patterns
- **[Schedule Function Guide](./SCHEDULE_FUNCTION_GUIDE.md)** - Schedule Edge Functions
- **[Complete Database Setup](./COMPLETE_DATABASE_SETUP.md)** - Step-by-step database setup
- **[V3 Migration & Refinement](./V3_MIGRATION.md)** - Redesign summary (Phases 1-18)

---

**Main README:** [../README.md](../README.md)
