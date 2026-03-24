-- Creates the first super_admin account
INSERT INTO admin.admin_users (email, full_name, role, is_active)
VALUES ('admin@vendoflow.com', 'Super Admin Momo', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

-- Run this after applying the migration to create your first admin account.
