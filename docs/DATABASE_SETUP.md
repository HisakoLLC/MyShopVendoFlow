# Database Setup Guide

Complete guide for setting up the VendoFlow database in Supabase.

## Prerequisites

1. Supabase account ([sign up](https://app.supabase.com))
2. New Supabase project created
3. Access to Supabase SQL Editor

## Setup Steps

### Step 1: Enable Required Extensions

Go to **Database → Extensions** and enable:

- `pg_cron` - For scheduling Edge Functions
- `uuid-ossp` - For UUID generation (usually enabled by default)

### Step 2: Run SQL Scripts in Order

Execute these scripts in the Supabase SQL Editor **in this exact order**:

#### 1. Row Level Security (RLS) Setup
```sql
-- File: sql/SETUP_ALL_RLS.sql
-- This sets up RLS policies for all tables
```

#### 2. Get Account ID Function
```sql
-- File: sql/FIX_GET_ACCOUNT_ID.sql
-- Creates get_account_id() RPC function
```

#### 3. Create Account Function
```sql
-- File: sql/FIX_PLAN_TIER.sql
-- Creates create_account() RPC function
```

#### 4. Demo Data Column
```sql
-- File: scripts/ADD_HAS_DEMO_DATA_COLUMN.sql
-- Adds has_demo_data column to accounts table
```

#### 5. M-Pesa Payments Table
```sql
-- File: CREATE_PENDING_MPESA_PAYMENTS_TABLE.sql
-- Creates pending_mpesa_payments table
```

### Step 3: Set Up Storage Buckets

1. Go to **Storage** in Supabase Dashboard
2. Create the following buckets:

#### Bucket: `product-images`
- **Public**: Yes
- **File size limit**: 5MB
- **Allowed MIME types**: image/png, image/jpeg, image/jpg
- **CORS**: Allow your domain(s)

#### Bucket: `business-logos`
- **Public**: Yes
- **File size limit**: 200KB
- **Allowed MIME types**: image/png, image/jpeg, image/jpg
- **CORS**: Allow your domain(s)

### Step 4: Configure CORS for Storage

For each bucket, add CORS policy:

```json
{
  "allowedOrigins": [
    "http://localhost:3000",
    "https://your-app.vercel.app"
  ],
  "allowedMethods": ["GET", "POST", "PUT"],
  "allowedHeaders": ["*"],
  "maxAgeSeconds": 3600
}
```

### Step 5: Deploy Edge Function

1. Go to **Edge Functions** in Supabase Dashboard
2. Create new function: `calculate-metrics`
3. Copy code from `supabase/functions/calculate-metrics/index.ts`
4. Deploy the function

### Step 6: Schedule Edge Function

Run this SQL in SQL Editor (replace `YOUR_ANON_KEY` with your actual anon key):

```sql
-- File: SCHEDULE_CALCULATE_METRICS.sql
-- Schedules calculate-metrics to run daily at 2 AM UTC
```

Or use Supabase Dashboard:
1. Go to **Database → Cron Jobs**
2. Create new job
3. Schedule: `0 2 * * *` (daily at 2 AM UTC)
4. Command: HTTP POST to your function URL

### Step 7: Configure Authentication

1. Go to **Authentication → URL Configuration**
2. Add redirect URLs:
   - `http://localhost:3000/**` (development)
   - `https://your-app.vercel.app/**` (production)
3. Enable email authentication
4. Configure email templates (optional)

### Step 8: Verify Setup

Run these queries to verify:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_account_id', 'create_account');

-- Check storage buckets
SELECT name, public 
FROM storage.buckets;
```

## Database Schema Overview

### Core Tables

- **accounts** - Business accounts (plan tiers, subscription status)
- **account_members** - Links auth.users to accounts (roles)
- **stores** - Store locations
- **categories** - Product categories
- **seasons** - Product seasons
- **product_styles** - Product styles (base info)
- **product_variants** - Variants (size, color, SKU)
- **inventory_levels** - Stock levels per store/variant
- **customers** - Customer profiles
- **sales** - Sales transactions
- **sale_line_items** - Sale line items
- **purchase_orders** - Purchase orders
- **po_line_items** - PO line items
- **suppliers** - Suppliers
- **inventory_transfers** - Store-to-store transfers
- **variant_metrics** - Calculated metrics (sell-through, days of inventory)
- **pending_mpesa_payments** - M-Pesa payment tracking

### Key Functions

- `get_account_id()` - Returns current user's account ID (RLS-aware)
- `create_account()` - Creates new account and links user

### Key Policies

All tables have RLS enabled with policies that:
- Filter by `account_id` (using `get_account_id()`)
- Allow owners/managers appropriate access
- Restrict access based on user role

## Troubleshooting

### "Permission denied" errors
- Verify RLS policies are created
- Check `get_account_id()` function exists
- Ensure user is authenticated

### "Function does not exist" errors
- Run the SQL scripts in order
- Check function permissions: `GRANT EXECUTE ON FUNCTION ...`

### Storage upload failures
- Verify bucket exists and is public
- Check CORS configuration
- Verify file size limits

### Edge Function not running
- Check function is deployed
- Verify cron job is scheduled
- Check function logs in Supabase Dashboard

## Backup & Recovery

### Regular Backups

Supabase automatically backs up your database. To create manual backup:

1. Go to **Database → Backups**
2. Click "Create Backup"
3. Download backup file

### Restore from Backup

1. Go to **Database → Backups**
2. Select backup
3. Click "Restore"

## Security Best Practices

1. **Never expose service role key** - Only use server-side
2. **Enable RLS on all tables** - Never disable for convenience
3. **Use RPC functions** - For complex operations that need elevated permissions
4. **Regular audits** - Review RLS policies quarterly
5. **Monitor access logs** - Check Supabase logs regularly

## Next Steps

After database setup:
1. Configure environment variables
2. Deploy to Vercel
3. Test all features
4. Monitor logs
5. Set up monitoring/alerts

---

**Need Help?** Check Supabase documentation or review the SQL scripts for comments.
