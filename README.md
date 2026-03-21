# VendoFlow - Fashion Boutique POS System

A comprehensive Point of Sale (POS) and retail management system built for fashion boutiques, featuring inventory management, sales tracking, customer management, purchase orders, and M-Pesa payment integration.

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Notifications**: Sonner
- **Payments**: M-Pesa Daraja API

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Supabase Account** - [Sign up](https://app.supabase.com)
2. **Vercel Account** - [Sign up](https://vercel.com)
3. **M-Pesa Daraja API Credentials** (optional, for payment integration)
4. **Node.js 18+** (for local development)

## 🛠️ Local Development Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd MyShopVendoFlow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create `.env.local` file in the project root and copy the template from `ENV_TEMPLATE.md`:

```bash
# Create .env.local and add your variables
# See ENV_TEMPLATE.md for the complete template
```

Fill in your environment variables (see [Environment Variables](#environment-variables) section below).

### 4. Set Up Supabase Database

1. Create a new Supabase project at [app.supabase.com](https://app.supabase.com)
2. Run the database setup scripts in order (see [docs/DATABASE_SETUP.md](./docs/DATABASE_SETUP.md) for details):
   - `sql/FIX_ALL_RLS_ISSUES.sql` - Fixes all RLS policies (run this first!)
   - `sql/FIX_GET_ACCOUNT_ID.sql` - Creates `get_account_id` RPC function
   - `sql/FIX_PLAN_TIER.sql` - Creates `create_account` RPC function
   - `scripts/ADD_HAS_DEMO_DATA_COLUMN.sql` - Adds demo data tracking column
   - `sql/CREATE_PENDING_MPESA_PAYMENTS_TABLE.sql` - Creates M-Pesa payments table (if using M-Pesa)

3. Enable required Supabase extensions:
   - Go to Database → Extensions
   - Enable: `pg_cron` (for scheduled Edge Functions)
   - Enable: `uuid-ossp` (for UUID generation)

4. Set up Supabase Storage buckets:
   - Create bucket: `product-images` (public)
   - Create bucket: `business-logos` (public)
   - Configure CORS policies for both buckets

5. Deploy Edge Function:
   - Navigate to Edge Functions in Supabase Dashboard
   - Deploy `supabase/functions/calculate-metrics`
   - Schedule it to run daily (see `SCHEDULE_CALCULATE_METRICS.sql`)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Production Deployment on Vercel

See [docs/VERCEL_DEPLOYMENT.md](./docs/VERCEL_DEPLOYMENT.md) for detailed deployment guide.

**Quick Steps:**

```bash
git add .
git commit -m "Prepare for production"
git push origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### Step 3: Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (keep secret!)
- `NEXT_PUBLIC_APP_URL` - Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)

**Optional (for M-Pesa):**
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `MPESA_SHORTCODE`
- `MPESA_ENVIRONMENT` - Set to `production` for live payments

### Step 4: Update Supabase Settings

1. **Update M-Pesa Callback URL:**
   - In Supabase Dashboard → Edge Functions → `calculate-metrics`
   - Update callback URL to: `https://your-app.vercel.app/api/mpesa/callback`

2. **Update Supabase Auth Redirect URLs:**
   - Go to Authentication → URL Configuration
   - Add your production URL to "Redirect URLs"
   - Add: `https://your-app.vercel.app/**`

3. **Update CORS (if needed):**
   - Go to Settings → API
   - Add your Vercel domain to allowed origins

### Step 5: Deploy

1. Click "Deploy" in Vercel
2. Wait for build to complete
3. Your app will be live at `https://your-app.vercel.app`

## 📝 Environment Variables

See `ENV_TEMPLATE.md` (in root) for the complete environment variables template. For troubleshooting, see [docs/FIX_INVALID_API_KEY.md](./docs/FIX_INVALID_API_KEY.md).

### Required Variables

| Variable | Description | Where to Get It |
|----------|-------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | Your Vercel deployment URL |

### Optional Variables (M-Pesa)

| Variable | Description | Where to Get It |
|----------|-------------|----------------|
| `MPESA_CONSUMER_KEY` | M-Pesa API consumer key | Safaricom Developer Portal |
| `MPESA_CONSUMER_SECRET` | M-Pesa API consumer secret | Safaricom Developer Portal |
| `MPESA_PASSKEY` | M-Pesa passkey | Safaricom Developer Portal |
| `MPESA_SHORTCODE` | M-Pesa business shortcode | Safaricom Developer Portal |
| `MPESA_ENVIRONMENT` | `sandbox` or `production` | Set based on your environment |

**Important**: Create `.env.local` for local development. Never commit this file to Git.

## 🗄️ Database Setup

See [docs/DATABASE_SETUP.md](./docs/DATABASE_SETUP.md) for complete setup instructions.

**Quick Setup:**
1. Create Supabase project at [app.supabase.com](https://app.supabase.com)
2. Run SQL scripts in order (see [docs/DATABASE_SETUP.md](./docs/DATABASE_SETUP.md)):
   - `sql/FIX_ALL_RLS_ISSUES.sql` - Fixes all RLS policies (run first!)
   - `sql/FIX_GET_ACCOUNT_ID.sql` - Creates `get_account_id` function
   - `sql/FIX_PLAN_TIER.sql` - Creates `create_account` function
   - `scripts/ADD_HAS_DEMO_DATA_COLUMN.sql` - Adds demo data tracking
   - `sql/CREATE_PENDING_MPESA_PAYMENTS_TABLE.sql` - M-Pesa payments (if using)

3. **Set Up Storage Buckets:**
   - Go to Storage in Supabase Dashboard
   - Create bucket: `product-images` (public)
   - Create bucket: `business-logos` (public)
   - Configure CORS: Allow your domain

4. **Deploy Edge Function:**
   - Go to Edge Functions
   - Deploy `supabase/functions/calculate-metrics`
   - Schedule it (see `SCHEDULE_CALCULATE_METRICS.sql`)

### Database Schema

The app uses the following main tables:
- `accounts` - Business accounts
- `account_members` - Links users to accounts
- `stores` - Store locations
- `product_styles` - Product styles
- `product_variants` - Product variants (size/color)
- `inventory_levels` - Stock levels per store
- `customers` - Customer profiles
- `sales` - Sales transactions
- `sale_line_items` - Sale line items
- `purchase_orders` - Purchase orders
- `suppliers` - Suppliers
- `variant_metrics` - Calculated variant metrics
- `pending_mpesa_payments` - M-Pesa payment tracking

## 🔐 Security Checklist

- [ ] Service role key is **never** exposed to client
- [ ] RLS policies are enabled on all tables
- [ ] M-Pesa credentials are stored securely in Vercel
- [ ] CORS is configured correctly in Supabase
- [ ] Auth redirect URLs are set correctly
- [ ] Environment variables are set in Vercel (not committed to git)

## 📦 Build & Deploy

### Local Build Test

```bash
npm run build
npm run start
```

### Vercel Deployment

Vercel automatically:
- Detects Next.js framework
- Runs `npm run build`
- Deploys to production
- Provides HTTPS
- Handles environment variables

## 🧪 Testing

### Test Checklist

- [ ] User signup and login
- [ ] Account setup flow
- [ ] Product creation
- [ ] Inventory management
- [ ] POS checkout (cash, M-Pesa)
- [ ] Customer management
- [ ] Purchase orders
- [ ] Dashboard metrics
- [ ] Settings pages

### Test M-Pesa Integration

1. Use sandbox credentials first
2. Test with test phone numbers (254708374149)
3. Verify callback URL is accessible
4. Test payment flow end-to-end
5. Switch to production credentials when ready

## 🐛 Troubleshooting

See the [docs](./docs) folder for detailed troubleshooting guides:

- **[Fix: Invalid API Key](./docs/FIX_INVALID_API_KEY.md)** - "Invalid API key" error
- **[Fix: Account Creation](./docs/FIX_ACCOUNT_CREATION_NOW.md)** - Account not being created
- **[Troubleshoot Signup](./docs/TROUBLESHOOT_SIGNUP.md)** - Signup issues
- **[Fix: Onboarding Errors](./docs/QUICK_FIX_ONBOARDING_ERROR.md)** - Permission denied during onboarding
- **[Complete Fix Guide](./docs/COMPLETE_FIX_GUIDE.md)** - Fix all RLS issues

### Quick Fixes

**1. "Permission denied" errors:**
- Run `sql/FIX_ALL_RLS_ISSUES.sql` in Supabase SQL Editor

**2. "Invalid API key" error:**
- Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and restart dev server

**3. Account not created during signup:**
- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Run `sql/FIX_ALL_RLS_ISSUES.sql`
- See [docs/FIX_ACCOUNT_CREATION_NOW.md](./docs/FIX_ACCOUNT_CREATION_NOW.md)

## 📚 Additional Resources

- **[V3 Migration Summary](./docs/V3_MIGRATION.md)** - Redesign & Overhaul (Phases 1-18)
- **[Changelog](./CHANGELOG.md)** - Project history and versioning
- **Documentation:** See [docs](./docs) folder for all guides and troubleshooting
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [M-Pesa Daraja API Docs](https://developer.safaricom.co.ke)

## 📄 License

[Your License Here]

## 🤝 Support

For issues and questions:
- Check the troubleshooting section
- Review Supabase logs
- Check Vercel deployment logs

---

**Built with ❤️ for fashion boutiques**
