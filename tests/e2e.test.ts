import { describe, it, expect, afterEach } from "vitest";
import { createTestProject, TestProject } from "./helpers/test-project.js";
import { runInit } from "../src/commands/init.js";
import { runCreate } from "../src/commands/create.js";
import { runResolve } from "../src/commands/resolve.js";
import { runStatus } from "../src/commands/status.js";
import { runDiff } from "../src/commands/diff.js";
import { runValidate } from "../src/commands/validate.js";

describe("end-to-end workflow", () => {
  let project: TestProject;

  afterEach(async () => {
    await project?.cleanup();
  });

  it("full lifecycle: init → create → override → resolve → status → diff → validate", async () => {
    project = await createTestProject();

    // 1. Set up a realistic SaaS project
    await project.writeFile(
      "config/features.json",
      JSON.stringify(
        { kanban: true, gantt: true, time_tracking: false, max_projects: 10, ai_assistant: false },
        null,
        2
      )
    );
    await project.writeFile(
      "config/theme.json",
      JSON.stringify({ color: "blue", font: "inter" }, null, 2)
    );
    await project.writeFile("src/app.ts", "export const app = 'my-saas';");

    // 2. Initialize variantform
    await runInit(project.path, [
      { path: "config/features.json", format: "json", strategy: "merge" },
      { path: "config/theme.json", format: "json", strategy: "replace" },
    ]);

    // 3. Create two variants
    await runCreate(project.path, "acme");
    await runCreate(project.path, "globex");

    // 4. Add overrides for Acme (merge strategy -- only deltas)
    await project.writeFile(
      "variants/acme/config/features.json",
      JSON.stringify({ time_tracking: true, max_projects: 50 }, null, 2)
    );

    // 5. Add overrides for Globex (merge + replace)
    await project.writeFile(
      "variants/globex/config/features.json",
      JSON.stringify({ gantt: false, max_projects: 5 }, null, 2)
    );
    await project.writeFile(
      "variants/globex/config/theme.json",
      JSON.stringify({ color: "dark-green", font: "roboto", logo: "globex.svg" }, null, 2)
    );

    // 6. Resolve Acme's features
    const acmeResults = await runResolve(project.path, "acme", "config/features.json");
    const acmeFeatures = JSON.parse(acmeResults[0].content);
    expect(acmeFeatures).toEqual({
      kanban: true,
      gantt: true,
      time_tracking: true,    // overridden
      max_projects: 50,       // overridden
      ai_assistant: false,    // from base, flows through
    });

    // 7. Resolve Globex's theme (replace strategy)
    const globexTheme = await runResolve(project.path, "globex", "config/theme.json");
    const theme = JSON.parse(globexTheme[0].content);
    // Replace strategy: override completely replaces base
    expect(theme).toEqual({ color: "dark-green", font: "roboto", logo: "globex.svg" });

    // 8. Check status
    const statuses = await runStatus(project.path);
    expect(statuses).toHaveLength(2);
    expect(statuses.find((s) => s.name === "acme")?.overrideCount).toBe(1);
    expect(statuses.find((s) => s.name === "globex")?.overrideCount).toBe(2);

    // 9. Check diff
    const acmeDiff = await runDiff(project.path, "acme");
    expect(acmeDiff).toHaveLength(1);
    expect(acmeDiff[0].overrideKeys).toContain("time_tracking");
    expect(acmeDiff[0].overrideKeys).toContain("max_projects");

    // 10. Validate -- should be clean
    const issues = await runValidate(project.path);
    expect(issues).toEqual([]);

    // 11. Simulate upstream evolution: base adds a new feature
    await project.writeFile(
      "config/features.json",
      JSON.stringify(
        { kanban: true, gantt: true, time_tracking: false, max_projects: 10, ai_assistant: true },
        null,
        2
      )
    );

    // 12. Resolve Acme again -- new feature flows through automatically!
    const acmeAfterUpdate = await runResolve(project.path, "acme", "config/features.json");
    const updatedFeatures = JSON.parse(acmeAfterUpdate[0].content);
    expect(updatedFeatures.ai_assistant).toBe(true); // NEW: from updated base
    expect(updatedFeatures.time_tracking).toBe(true); // STILL: Acme's override
    expect(updatedFeatures.max_projects).toBe(50);    // STILL: Acme's override

    // 13. Simulate base removing a key that an override references
    await project.writeFile(
      "config/features.json",
      JSON.stringify(
        { kanban: true, gantt: true, ai_assistant: true },
        null,
        2
      )
    );
    // base removed time_tracking and max_projects, but Acme overrides them

    // 14. Validate catches stale keys
    const staleIssues = await runValidate(project.path);
    expect(staleIssues.length).toBeGreaterThan(0);
    expect(staleIssues.some((i) => i.type === "stale_key" && i.key === "time_tracking")).toBe(true);
  });
});
