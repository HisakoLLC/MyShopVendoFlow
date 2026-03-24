# VendoFlow Administrative Console Deployment

The administrative console (`/app/admin`) is designed to be deployed as a standalone Vercel project, isolated from the primary boutique storefront but sharing the same core logic and database schema.

## Deployment Strategy

- **Repository**: Same GitHub repository as the main application.
- **Vercel Project**: Create a NEW project in Vercel for the admin console.
- **Root Directory**: Set to `/` (identical to the main application).
- **Environment Flag**: Set `NEXT_PUBLIC_APP_MODE=admin` in the Vercel project settings.
- **Domain**: Assign `command.vendoflow.com` to this project.

## Configuration Requirements

The following environment variables MUST be configured in the Vercel project to ensure the admin console operates correctly:

### Core Infrastructure
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anonymous key for client-side auth.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for administrative database operations (bypass RLS).

### Communication & Operations
- `WHATSAPP_ACCESS_TOKEN`: Meta API access token for sending reports and messages.
- `WHATSAPP_PHONE_NUMBER_ID`: `758586530674011` (VendoFlow Verified Number).
- `CRON_SECRET`: Random secret key to authorize the `/api/admin/reports/cron` route.

## Automation

Automated report generation is configured via `vercel.json` to run daily at **05:00 UTC**. Ensure the `CRON_SECRET` is shared between Vercel and any automated triggers.

## Security Note

The admin system uses Role-Based Access Control (RBAC). Ensure your email is seeded in the `admin.admin_users` table with the `super_admin` role before attempting to manage staff or system settings.
