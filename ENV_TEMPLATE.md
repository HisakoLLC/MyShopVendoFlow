# Environment Variables Template

Copy this content to create your `.env.local` file for local development.

```env
# Supabase Configuration
# Get these from your Supabase project settings: https://app.supabase.com/project/_/settings/api

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Service Role Key (Server-side only - NEVER expose to client)
# Get from Supabase Dashboard → Settings → API → service_role key
# Required for: Staff creation, Edge Function scheduling
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# M-Pesa Daraja API Configuration
# Get from Safaricom Developer Portal: https://developer.safaricom.co.ke
# Required for: M-Pesa STK Push payments

MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_PASSKEY=your-passkey
MPESA_SHORTCODE=your-shortcode
MPESA_ENVIRONMENT=sandbox
# Change to 'production' when ready for live payments

# Application URL
# Update this to your production domain after deployment
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Production example: NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Node Environment
# Vercel automatically sets this to 'production' in production
NODE_ENV=development
```

## How to Use

1. Create `.env.local` in the project root
2. Copy the content above
3. Replace placeholder values with your actual credentials
4. Never commit `.env.local` to Git (it's in `.gitignore`)

## Where to Get Values

### Supabase
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### M-Pesa (Optional)
1. Go to [Safaricom Developer Portal](https://developer.safaricom.co.ke)
2. Create an app
3. Get credentials from app dashboard
4. Use sandbox credentials for testing

### Application URL
- **Local**: `http://localhost:3000`
- **Production**: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
