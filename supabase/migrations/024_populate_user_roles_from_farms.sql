-- Populate user_roles table from farms table (farm owners should have farm_owner role)
INSERT INTO user_roles (user_id, farm_id, role, created_at, updated_at)
SELECT owner_id, id, 'farm_owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM farms f
WHERE owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = f.owner_id 
    AND ur.farm_id = f.id 
    AND ur.role = 'farm_owner'
  )
ON CONFLICT DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_farm ON user_roles(user_id, farm_id);
