import type { AppUpdatePlan, ProjectId } from "../types.js"
import { type GitlabClient, getProjectWebUrl } from "./gitlab.js"

export function describePlan(plan: AppUpdatePlan): Record<string, unknown> {
  return {
    projectName: plan.app.projectName,
    previousTag: plan.previousTag,
    latestTag: plan.latestTag.name,
  }
}

export function buildTitle(plans: readonly AppUpdatePlan[]): string {
  return `chore: update ${plans.length} app image tag(s)`
}

async function resolveProjectWebUrl(
  gitlab: GitlabClient,
  projectId: ProjectId,
  cache: Map<ProjectId, string>,
): Promise<string> {
  const cached = cache.get(projectId)
  if (cached !== undefined) return cached
  const webUrl = await getProjectWebUrl(gitlab, projectId)
  cache.set(projectId, webUrl)
  return webUrl
}

function buildPlanSection(plan: AppUpdatePlan, webUrl: string): string {
  const tagUrl = `${webUrl}/-/tags/${encodeURIComponent(plan.latestTag.name)}`
  const pipelineLine = plan.pipelineUrl
    ? `- パイプライン: [${plan.pipelineStatus ?? "unknown"}](${plan.pipelineUrl})`
    : "- パイプライン: (見つかりません)"
  return [
    `### ${plan.app.projectName}`,
    `- タグ: ${plan.previousTag ?? "(未設定)"} → [${plan.latestTag.name}](${tagUrl})`,
    `- 打刻日時: ${plan.latestTag.builtAt.toISOString()}`,
    pipelineLine,
  ].join("\n")
}

export async function buildDescription(
  gitlab: GitlabClient,
  plans: readonly AppUpdatePlan[],
): Promise<string> {
  const webUrlCache = new Map<ProjectId, string>()
  const sections: string[] = []

  for (const plan of plans) {
    const webUrl = await resolveProjectWebUrl(gitlab, plan.app.projectId, webUrlCache)
    sections.push(buildPlanSection(plan, webUrl))
  }

  return sections.join("\n\n")
}
