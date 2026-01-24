# Calculate Variant Metrics Edge Function

This Supabase Edge Function calculates and updates variant metrics nightly, including sell-through rates, days of inventory, stock health, and restock urgency scores.

## Function Overview

The function processes all product variants and calculates:

- **Sell-through rates** (30d, 60d, 90d): Percentage of inventory sold in the period
- **Average daily sales** (30d): Units sold per day over the last 30 days
- **Days of inventory**: Current stock divided by average daily sales
- **Restock urgency score**: Calculated urgency based on days of inventory and sell-through
- **Stock health**: Categorized as `healthy`, `low_stock`, `dead_stock`, or `out_of_stock`

## Deployment

### Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

### Deploy the Function

```bash
supabase functions deploy calculate-metrics
```

### Schedule the Function

To run nightly at 2 AM:

```bash
supabase functions schedule calculate-metrics --cron "0 2 * * *"
```

Or use the Supabase Dashboard:
1. Go to **Edge Functions** → **calculate-metrics**
2. Click **Schedule**
3. Set cron expression: `0 2 * * *` (runs at 2 AM daily)

## Environment Variables

The function uses these environment variables (automatically available in Supabase):

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (bypasses RLS)

These are automatically injected by Supabase - no manual configuration needed.

## Manual Testing

You can manually invoke the function:

```bash
supabase functions invoke calculate-metrics
```

Or via HTTP:

```bash
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/calculate-metrics \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Response Format

Success response:
```json
{
  "success": true,
  "message": "Processed 150 variants successfully",
  "processed": 150,
  "errors": 0,
  "timestamp": "2024-01-15T02:00:00.000Z"
}
```

Error response:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Calculation Details

### Sell-Through Rate
Formula: `(units_sold / (current_stock + units_sold)) × 100`

This approximates starting inventory as `current_stock + units_sold` for simplicity.

### Days of Inventory
Formula: `current_stock / avg_daily_sales_30d`

If `avg_daily_sales_30d = 0`, set to `999` (effectively infinite).

### Restock Urgency Score
Formula: `min(100, max(0, (100 - days_of_inventory) + (sell_through_90d × 0.5)))`

Higher scores indicate more urgent restocking needs.

### Stock Health
- `out_of_stock`: `current_stock = 0`
- `low_stock`: `days_of_inventory < 7`
- `dead_stock`: `sell_through_90d < 10%` AND `current_stock > 3`
- `healthy`: All other cases

## Error Handling

- Individual variant errors are logged but don't stop processing
- Failed variants are skipped and counted in the `errors` field
- If the entire function fails, it returns a 500 error

## Performance

- Processes variants sequentially to avoid overwhelming the database
- Upserts metrics in batches of 1000 rows
- Typical runtime: ~1-2 seconds per 100 variants

## Monitoring

Check function logs in Supabase Dashboard:
1. Go to **Edge Functions** → **calculate-metrics**
2. Click **Logs** to view execution history and errors
