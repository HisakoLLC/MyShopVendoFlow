export const PLAN_LIMITS: Record<string, number> = {
  starter: 1,
  core: 3,
  scale: 10,
}

export function getPlanLimit(tier: string | null | undefined): number {
  if (!tier) return PLAN_LIMITS.starter
  const key = tier.toLowerCase()
  return PLAN_LIMITS[key] ?? PLAN_LIMITS.starter
}

