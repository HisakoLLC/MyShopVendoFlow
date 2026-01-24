# Fix: "Invalid API key" Error During Signup

## 🚨 Error

```
Failed to create account: Invalid API key. Code: undefined
```

## ✅ Solution

The `SUPABASE_SERVICE_ROLE_KEY` is either missing, incorrect, or not loaded.

### Step 1: Check `.env.local` File

1. Open `.env.local` in your project root
2. Make sure you have:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 2: Get the Correct Service Role Key

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Find the **`service_role`** key (NOT the `anon` key)
3. It's a very long JWT token (starts with `eyJ...` and is 200+ characters)
4. Copy the **entire** key

### Step 3: Add to `.env.local`

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXJwcm9qZWN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NjE2ODAwMCwiZXhwIjoxOTYxNzQ0MDAwfQ.very-long-token-here...
```

**Important:**
- ❌ No quotes: `SUPABASE_SERVICE_ROLE_KEY="eyJ..."`
- ❌ No spaces: `SUPABASE_SERVICE_ROLE_KEY= eyJ...`
- ✅ Correct: `SUPABASE_SERVICE_ROLE_KEY=eyJ...`

### Step 4: Restart Dev Server

**CRITICAL:** Environment variables are loaded at startup.

1. Stop your dev server (Ctrl+C in terminal)
2. Start it again: `npm run dev`
3. Try signing up again

### Step 5: Verify It's Loaded

After restarting, check the terminal where `npm run dev` is running. When you try to sign up, you should see:

```
Using service role key (length: 200+ chars)
Creating account: { accountId: "...", ... }
```

If you see "Service role key missing" or "Service role key appears to be invalid", the key isn't set correctly.

## 🔍 Common Mistakes

### Mistake 1: Using Anon Key Instead

- ❌ Wrong: Using `NEXT_PUBLIC_SUPABASE_ANON_KEY` value
- ✅ Right: Using `service_role` key from Supabase Dashboard

### Mistake 2: Not Restarting Server

- Environment variables are only loaded when the server starts
- Must restart after adding/changing `.env.local`

### Mistake 3: Wrong File

- Must be `.env.local` (not `.env` or `.env.example`)
- Must be in project root (same folder as `package.json`)

### Mistake 4: Extra Characters

- No quotes around the value
- No spaces before/after `=`
- No line breaks in the key

### Mistake 5: Incomplete Key

- Service role keys are very long (200+ characters)
- Make sure you copied the entire key
- Should start with `eyJ` and end with a long string

## 🧪 Quick Test

After fixing, try signing up and check:

1. **Browser Console** - Should see:
   ```
   Using service role key (length: 200+ chars)
   Creating account: { ... }
   Account created successfully: ...
   ```

2. **Terminal** (where `npm run dev` is running) - Should see same logs

3. **Database** - Should have new records:
   ```sql
   SELECT * FROM accounts ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM account_members ORDER BY created_at DESC LIMIT 1;
   ```

## ⚠️ If Still Not Working

1. **Double-check the key:**
   - Go to Supabase Dashboard → Settings → API
   - Click "Reveal" on the `service_role` key
   - Copy it again (make sure you get the whole thing)

2. **Check for typos:**
   - Variable name: `SUPABASE_SERVICE_ROLE_KEY` (not `SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_KEY`)
   - No extra spaces or quotes

3. **Verify file location:**
   - `.env.local` should be in the same folder as `package.json`
   - Not in a subfolder

4. **Check terminal output:**
   - Look for "Service role key missing" or "Service role key appears to be invalid"
   - This will tell you exactly what's wrong

---

**After fixing, account creation should work automatically!** ✅
