export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  github_repo: string | null;
  github_installation_id: number | null;
  default_branch: string;
  surface_count?: number;
  variant_count?: number;
}

export type SurfaceFormat = "json" | "yaml" | "css" | "code" | "markdown" | "asset" | "template" | "text";

export interface Surface {
  path: string;
  format: SurfaceFormat;
  strategy: "merge" | "replace";
  base_content: string;
}

export interface Variant {
  name: string;
  override_count: number;
}

export interface Override {
  surface_path: string;
  content: string;
  sha: string; // GitHub blob SHA for updates
}
