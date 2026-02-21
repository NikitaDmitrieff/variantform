import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getRepoContext, fetchConfig, fetchFile } from "@/lib/github-repo";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an expert at helping SaaS developers set up multi-client customization for their products using variantform.

variantform is an overlay system where a .variantform.yaml file declares "surfaces" — files in the repo that can be customized per client. Each surface has a format and strategy:
- json/yaml formats support "merge" (delta overlays using RFC 7396 JSON Merge Patch) or "replace" (full file swap)
- css, code, markdown, asset, template, text formats only support "replace" (full file swap)

Variants live under variants/<client-name>/ and only include files that differ from the base.

Your job:
1. Analyze the developer's codebase (you'll receive the file tree and key files)
2. Ask questions to understand what they want to customize per client
3. Suggest which files should be declared as surfaces and why
4. Produce a structured customization plan as JSON when the developer approves

When producing the final plan, output a JSON block with this structure:
\`\`\`json
{
  "surfaces": [
    { "path": "config/features.json", "format": "json", "strategy": "merge", "reason": "..." },
    { "path": "public/logo.svg", "format": "asset", "strategy": "replace", "reason": "..." }
  ],
  "install_variantform": true,
  "create_variants": ["acme", "globex"],
  "refactoring": [
    { "description": "Extract hardcoded colors from globals.css into config/theme.json", "files": ["src/app/globals.css", "config/theme.json"] }
  ]
}
\`\`\`

Be conversational, ask one question at a time, and guide the developer step by step.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { project_id, messages } = await request.json();

  // Fetch project for repo context
  const { data: project } = await supabase
    .from("vf_projects")
    .select("*")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
    });
  }

  // Build repo context for the system prompt
  let repoContext = "";
  if (project.github_repo && project.github_installation_id) {
    try {
      const ctx = await getRepoContext(
        project.github_installation_id,
        project.github_repo,
        project.default_branch
      );

      // Fetch file tree via Trees API
      const { data: tree } = await ctx.octokit.request(
        "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
        {
          owner: ctx.owner,
          repo: ctx.repo,
          tree_sha: ctx.branch,
          recursive: "1",
        }
      );
      const fileList = tree.tree
        .filter((t: any) => t.type === "blob")
        .map((t: any) => t.path)
        .slice(0, 200);

      // Fetch package.json if it exists
      const packageJson = await fetchFile(ctx, "package.json");

      // Check for existing .variantform.yaml
      let existingConfig = null;
      try {
        existingConfig = await fetchConfig(ctx);
      } catch {
        /* not set up yet */
      }

      repoContext = `\n\nRepo: ${project.github_repo}\nBranch: ${project.default_branch}\n\nFile tree:\n${fileList.join("\n")}\n\npackage.json:\n${packageJson?.content || "not found"}\n\nExisting .variantform.yaml: ${existingConfig ? JSON.stringify(existingConfig) : "not set up yet"}`;
    } catch (e) {
      repoContext = `\n\nCould not fetch repo context: ${e instanceof Error ? e.message : "unknown error"}`;
    }
  }

  // Stream response from Claude
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT + repoContext,
    messages: messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  });

  // Return as SSE stream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
              )
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        const errorMsg =
          e instanceof Error ? e.message : "Stream error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: errorMsg })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
