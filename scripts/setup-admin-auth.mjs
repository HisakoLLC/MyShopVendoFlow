import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Small helper to parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return
  const [key, ...valueChunks] = trimmed.split('=')
  if (key && valueChunks.length > 0) {
    const value = valueChunks.join('=').trim().split('#')[0].trim()
    env[key.trim()] = value
  }
})

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY 
// Note: createUser needs service_role, but I'll log which one is found

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function setup() {
  const email = 'admin@vendoflow.com'
  const name = 'Super Admin Momo'
  const password = 'VendoFlowAdmin2026!' // Temporary secure password

  console.log(`Setting up admin auth for ${email}...`)

  // 1. Create Auth User
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, is_admin: true }
  })

  if (authError) {
    if (authError.message.includes('already exists')) {
      console.log('Auth user already exists. Fetching existing user...')
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) throw listError
      const existingUser = users.find(u => u.email === email)
      if (!existingUser) throw new Error('Could not find existing user')
      authData.user = existingUser
    } else {
      throw authError
    }
  } else {
    console.log('Auth user created successfully.')
  }

  // 2. Link to admin.admin_users
  const { error: dbError } = await supabase
    .schema('admin')
    .from('admin_users')
    .upsert({
      id: authData.user.id,
      email,
      full_name: name,
      role: 'super_admin',
      is_active: true
    }, { onConflict: 'email' })

  if (dbError) throw dbError

  console.log('Admin record linked successfully.')
  console.log('-----------------------------------')
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
  console.log('-----------------------------------')
  console.log('You can now log in at /admin/login')
}

setup().catch(err => {
  console.error('Setup failed:', err)
  process.exit(1)
})
