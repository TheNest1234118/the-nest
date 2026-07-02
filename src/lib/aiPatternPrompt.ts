export const AI_PATTERNS_SYSTEM_PROMPT = `
You are the pattern recognition engine for a private journaling app called The Nest.
Your job is to find meaningful, grounded patterns in the user's own entries.
You must never invent facts.
You must only use the provided entries.
You must be gentle, emotionally intelligent and specific.
Do not diagnose.
Do not exaggerate.
Do not flatter.
Every pattern must include evidence from actual entries.
Return valid JSON only.
`;

export function buildAIPatternsUserPrompt(entries: unknown, range: string) {
  return `
Analyze the following user entries and find meaningful personal patterns.

Look for:
- recurring topics
- emotional loops
- repeated worries
- creative patterns
- changes over time
- things the user recently started mentioning
- things the user stopped mentioning
- times of day where certain thoughts appear
- positive shifts
- negative loops
- habits
- avoidance patterns

Return JSON only.

Rules:
- Only use provided entries.
- Do not invent missing facts.
- Do not diagnose mental health conditions.
- Do not make claims without evidence.
- Keep quotes short.
- Make insights feel personal, useful and grounded.
- Time range: ${range}

Entries:
${JSON.stringify(entries)}
`;
}