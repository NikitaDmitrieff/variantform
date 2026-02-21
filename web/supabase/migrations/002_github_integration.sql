-- Add GitHub fields to vf_projects
ALTER TABLE vf_projects
  ADD COLUMN github_repo text,
  ADD COLUMN github_installation_id bigint,
  ADD COLUMN default_branch text DEFAULT 'main';

-- Drop tables that are now served from Git
DROP TABLE IF EXISTS vf_overrides;
DROP TABLE IF EXISTS vf_surfaces;
DROP TABLE IF EXISTS vf_variants;
