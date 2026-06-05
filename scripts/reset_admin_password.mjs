import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function run() {
  console.log('Fetching auth users...')
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Failed to list users:', listError)
    return
  }

  // Find users with admin metadata or admin emails
  const admins = users.filter(u => u.email === 'admin@vendoflow.com' || u.user_metadata?.is_admin === true)
  console.log(`Found ${admins.length} admin users:`, admins.map(u => ({ id: u.id, email: u.email, metadata: u.user_metadata })))

  if (admins.length === 0) {
    console.log('No admin users found in auth.users')
    return
  }

  for (const admin of admins) {
    console.log(`Resetting password for admin: ${admin.email} (${admin.id})...`)
    const { data, error } = await supabase.auth.admin.updateUserById(admin.id, {
      password: 'qwertymoha'
    })

    if (error) {
      console.error(`Failed to reset password for ${admin.email}:`, error.message)
    } else {
      console.log(`Successfully reset password for ${admin.email} to 'qwertymoha'!`)
    }
  }
}

run()
