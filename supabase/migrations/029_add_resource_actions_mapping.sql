-- Migration 029: Add per-resource action mapping to access control policies
-- Purpose: Store the relationship between each resource and its allowed actions
-- This allows one policy to have different actions per resource

-- Add JSONB column to store per-resource action mapping
-- Format: { "animals": ["view", "create"], "health": ["view", "manage"], ... }
ALTER TABLE access_control_policies
ADD COLUMN resource_actions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Create index on resource_actions for efficient queries
CREATE INDEX idx_access_control_resource_actions_gin ON access_control_policies USING GIN (resource_actions)
WHERE resource_actions IS NOT NULL;

-- Add comment documenting the structure
COMMENT ON COLUMN access_control_policies.resource_actions IS 
  'JSONB mapping of resources to their allowed actions. 
   Format: { "resource_name": ["action1", "action2", ...], ... }
   Example: { "animals": ["view", "create"], "health": ["view", "manage"] }
   This column stores per-resource action permissions to map which actions apply to which resource.';

-- Verify structure
-- Sample query to get all resources with their actions for a policy:
-- SELECT jsonb_object_keys(resource_actions) as resource,
--        resource_actions ->> resource as actions
-- FROM access_control_policies
-- WHERE id = policy_id;
