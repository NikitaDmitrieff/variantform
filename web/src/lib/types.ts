export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  surface_count?: number;
  variant_count?: number;
}

export interface Surface {
  id: string;
  project_id: string;
  path: string;
  format: "json" | "yaml";
  strategy: "merge" | "replace";
  base_content: string;
}

export interface Variant {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
  override_count?: number;
}

export interface Override {
  id: string;
  variant_id: string;
  surface_id: string;
  content: string;
  updated_at: string;
}
