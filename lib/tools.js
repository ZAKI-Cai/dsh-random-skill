/**
 * Model-facing tools for dsh-skillbox.
 *
 * Two tools, both about the lifecycle a randomly generated skill goes through:
 *
 * - `skillbox_pending` — the trial handoff. The generated skill is already in the
 *   session catalog because it sits in `<workspace>/.dsh/skills`; this tool makes
 *   the trial explicit by returning the skill's instructions and telling the model
 *   to follow them, then to close the loop with `skillbox_decide`.
 * - `skillbox_decide` — records the user's keep/delete decision for a skill.
 *
 * Schemas and prompt copy live in `tool-contract.js`, so a field exists on both
 * sides or on neither.
 *
 * @module dsh-skillbox/tools
 */

import {
  DECIDE_OUTPUT_SCHEMA,
  PENDING_OUTPUT_SCHEMA,
  PROMPT_SECTION,
  PROMPT_TEXT,
  TOOL_DECIDE,
  TOOL_PENDING,
} from './tool-contract.js'

const PENDING_DESCRIPTION =
  '读取 dsh-skillbox 中等待试用的随机 skill：返回它的名称、简介与完整说明，并要求在本次对话中按该说明执行任务。' +
  '当用户点击了「试用」、或用户提到待试用的随机 skill 时调用。返回后请按 <skill_instructions> 完成一次真实任务，' +
  `最后调用 ${TOOL_DECIDE} 处理「保留到 skill 包 / 删除该 skill」的决策。`

/**
 * Register both tools on the host tool registry.
 *
 * @param ctx - host plugin context.
 * @param api - the skillbox face returned by the plugin entry's `apply`.
 */
export function registerTools(ctx, api) {
  const tools = ctx.get('tools')

  if (tools !== undefined) {
    ctx.effect(
      () =>
        tools.register({
          name: TOOL_PENDING,
          description: PENDING_DESCRIPTION,
          parameters: {},
          output: {
            schema: PENDING_OUTPUT_SCHEMA,
            render: (_args, value) => [
              {
                type: 'text',
                text:
                  value.name === ''
                    ? value.instructions
                    : [
                        `<skill_content name="${value.name}">`,
                        '<skill_resources>',
                        `这是 dsh-skillbox 生成的待试用 skill（领域 ${value.domain} · ${value.familySubject} · ${value.recipeLabel}，${value.characters} 字，种子 ${value.seed}）。`,
                        '</skill_resources>',
                        '',
                        '<skill_instructions>',
                        value.instructions,
                        '</skill_instructions>',
                        '</skill_content>',
                        '',
                        `请严格按上述说明在本次对话中真实使用「${value.name}」完成一次任务；完成后调用 ${TOOL_DECIDE} 并传入 name="${value.name}"，把「保留到 skill 包 / 删除该 skill」交给用户选择。`,
                      ].join('\n'),
              },
            ],
          },
          async execute() {
            const offer = await api.offer()
            if (offer === null) {
              return {
                name: '',
                description: '',
                whenToUse: '',
                domain: '',
                familySubject: '',
                recipeLabel: '',
                characters: 0,
                seed: 0,
                instructions: '当前没有待试用的 skill。用户可以在右侧 skillbox 侧边栏点击「生成随机 Skill」。',
                state: 'none',
                waitForDecision: false,
              }
            }
            return {
              name: offer.name,
              description: offer.description,
              whenToUse: offer.whenToUse ?? '',
              domain: offer.domainLabel ?? '',
              familySubject: offer.familySubject ?? '',
              recipeLabel: offer.recipeLabel ?? '',
              characters: offer.characters ?? (offer.body ?? '').length,
              seed: offer.seed ?? 0,
              instructions: offer.body,
              state: offer.state,
              waitForDecision: true,
            }
          },
          presentCall() {
            return { card: 'generic', title: '读取待试用的 skill' }
          },
        }),
      'skillbox: pending tool',
    )

    ctx.effect(
      () =>
        tools.register({
          name: TOOL_DECIDE,
          description:
            '处理 dsh-skillbox 生成的 skill 的归属决策：保留到 skill 包，或删除该 skill。' +
            '试用结束后必须调用本工具让用户在两个选项中作出选择，不要自行替用户决定。',
          parameters: {
            name: { type: 'string', required: true, description: 'skill 名称，必须与待试用 skill 完全一致。' },
          },
          output: {
            schema: DECIDE_OUTPUT_SCHEMA,
            render: (_args, value) => [{ type: 'text', text: value.message }],
          },
          async execute(args) {
            const skillName = String(args?.name ?? '')
            const box = api.box()
            const record = await box.record(skillName)
            if (record === undefined) {
              return {
                name: skillName,
                state: 'missing',
                kept: false,
                message: `skillbox 中没有名为「${skillName}」的 skill；可能是名称写错或该 skill 已被删除。`,
              }
            }
            await box.patch(skillName, { state: 'kept' })
            return {
              name: skillName,
              state: 'kept',
              kept: true,
              message:
                `「${skillName}」已默认保留在 skillbox 中。` +
                '请在「保留到 skill 包」与「删除该 skill」之间让用户选择：右侧 skillbox 侧边栏已给出这两个按钮，' +
                '用户也可以随时用侧边栏开关启用或禁用该 skill。',
            }
          },
          presentCall(args) {
            return { card: 'generic', title: `决定 skill「${String(args?.name ?? '')}」的去留`, kind: 'other' }
          },
          presentResult(args, result) {
            const skillName = String(args?.name ?? '')
            return {
              card: 'generic',
              title: `skill「${skillName}」：保留到 skill 包 / 删除该 skill`,
              content: [{ type: 'text', text: String(result?.message ?? '') }],
            }
          },
        }),
      'skillbox: decide tool',
    )
  }

  const prompt = ctx.get('systemPrompt')
  if (prompt !== undefined) {
    ctx.effect(
      () => prompt.section({ name: PROMPT_SECTION.name, order: PROMPT_SECTION.order, text: PROMPT_TEXT }),
      'skillbox: prompt section',
    )
  }
}
