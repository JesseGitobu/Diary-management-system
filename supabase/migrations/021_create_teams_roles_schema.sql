-- supabase/migrations/021_create_teams_roles_schema.sql
-- Teams & Roles Management System

-- 1. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(farm_id, name)
);

-- 2. WORKERS TABLE
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  worker_number VARCHAR(100) NOT NULL,
  employment_status VARCHAR(50) NOT NULL CHECK (employment_status IN ('full-time', 'part-time', 'casual', 'active', 'inactive')),
  casual_rate DECIMAL(10, 2),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  shift VARCHAR(50),
  position VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(farm_id, worker_number)
);

-- 3. TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  assigned_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  due_date DATE,
  due_time TIME,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  task_type VARCHAR(50) DEFAULT 'one_time' CHECK (task_type IN ('one_time', 'daily', 'weekly', 'custom')),
  recurrence_pattern VARCHAR(100),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. DAILY TASK INSTANCES TABLE (for tracking daily recurring tasks)
CREATE TABLE IF NOT EXISTS daily_task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  assigned_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, assigned_date, farm_id)
);

-- 5. USER FARM ROLES TABLE
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('farm_owner', 'farm_manager', 'department_lead', 'supervisor', 'worker')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, farm_id)
);

-- 6. ROLE PERMISSIONS TABLE (for customizable permissions per farm)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('farm_owner', 'farm_manager', 'department_lead', 'supervisor', 'worker')),
  feature VARCHAR(100) NOT NULL,
  access_level VARCHAR(50) NOT NULL CHECK (access_level IN ('none', 'read', 'write', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(farm_id, role, feature)
);

-- 7. FARM INVITATIONS TABLE (extended)
CREATE TABLE IF NOT EXISTS farm_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('farm_owner', 'farm_manager', 'department_lead', 'supervisor', 'worker')),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX idx_workers_farm_id ON workers(farm_id);
CREATE INDEX idx_workers_department_id ON workers(department_id);
CREATE INDEX idx_departments_farm_id ON departments(farm_id);
CREATE INDEX idx_tasks_farm_id ON tasks(farm_id);
CREATE INDEX idx_tasks_department_id ON tasks(department_id);
CREATE INDEX idx_tasks_assigned_worker_id ON tasks(assigned_worker_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_daily_task_instances_farm_id ON daily_task_instances(farm_id);
CREATE INDEX idx_daily_task_instances_task_id ON daily_task_instances(task_id);
CREATE INDEX idx_daily_task_instances_assigned_date ON daily_task_instances(assigned_date);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_farm_id ON user_roles(farm_id);
CREATE INDEX idx_role_permissions_farm_id ON role_permissions(farm_id);
CREATE INDEX idx_farm_invitations_farm_id ON farm_invitations(farm_id);
CREATE INDEX idx_farm_invitations_email ON farm_invitations(email);

-- ✅ PARTIAL UNIQUE INDEX: Ensures only one pending invitation per farm/email combination
CREATE UNIQUE INDEX idx_farm_invitations_pending_email ON farm_invitations(farm_id, email) 
WHERE accepted_at IS NULL;

-- ROW LEVEL SECURITY (RLS) POLICIES

-- DEPARTMENTS RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view departments of their farms" ON departments
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM user_farms WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm managers can insert departments" ON departments
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm managers can update departments" ON departments
  FOR UPDATE USING (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager')
    )
  );

-- WORKERS RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workers of their farms" ON workers
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM user_farms WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm managers can insert workers" ON workers
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm managers can update workers" ON workers
  FOR UPDATE USING (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager')
    )
  );

-- TASKS RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks of their farms" ON tasks
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM user_farms WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm managers and assigned workers can insert tasks" ON tasks
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager', 'department_lead', 'supervisor')
    )
  );

CREATE POLICY "Farm managers can update tasks" ON tasks
  FOR UPDATE USING (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager', 'department_lead')
    )
    OR 
    assigned_worker_id IN (
      SELECT workers.id FROM workers WHERE workers.farm_id IN (
        SELECT farm_id FROM user_farms WHERE user_id = auth.uid()
      )
    )
  );

-- DAILY TASK INSTANCES RLS
ALTER TABLE daily_task_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view daily task instances of their farms" ON daily_task_instances
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM user_farms WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Assigned workers and managers can update daily tasks" ON daily_task_instances
  FOR UPDATE USING (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager')
    )
    OR
    worker_id IN (
      SELECT workers.id FROM workers WHERE workers.farm_id IN (
        SELECT farm_id FROM user_farms WHERE user_id = auth.uid()
      )
    )
  );

-- USER FARM ROLES RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm owners can view team roles" ON user_roles
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'farm_owner'
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Farm owners can manage roles" ON user_roles
  FOR ALL USING (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'farm_owner'
    )
  );

-- ROLE PERMISSIONS RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view permissions of their farms" ON role_permissions
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM user_farms WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm owners can manage permissions" ON role_permissions
  FOR ALL USING (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'farm_owner'
    )
  );

-- FARM INVITATIONS RLS
ALTER TABLE farm_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm owners and invited users can view invitations" ON farm_invitations
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager')
    )
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

CREATE POLICY "Farm owners can create invitations" ON farm_invitations
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners can manage invitations" ON farm_invitations
  FOR UPDATE USING (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager')
    )
  );

-- Note: Default role permissions should be configured during farm onboarding
-- Use application logic to set up permissions for each new farm_id
