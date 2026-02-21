-- Worker jobs for AI-driven repo modifications
CREATE TABLE IF NOT EXISTS vf_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES vf_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  job_type text NOT NULL CHECK (job_type IN ('onboarding', 'variant_create', 'variant_modify')),
  plan jsonb NOT NULL DEFAULT '{}',
  result jsonb,
  pr_url text,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: users can only see their own jobs
ALTER TABLE vf_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own jobs" ON vf_jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own jobs" ON vf_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat sessions for AI onboarding conversations
CREATE TABLE IF NOT EXISTS vf_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES vf_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  messages jsonb NOT NULL DEFAULT '[]',
  plan jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: users can only see their own chat sessions
ALTER TABLE vf_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own chat sessions" ON vf_chat_sessions
  FOR ALL USING (auth.uid() = user_id);
