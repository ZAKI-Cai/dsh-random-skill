/**
 * Model-facing tool schemas, defined once.
 *
 * The tool registration in `tools.js` and any client-side renderer of the same
 * payload both read this module, so a field added here cannot exist on one side
 * only. Keeping the shapes as plain JSON Schema objects also makes them testable
 * without a Cordis context.
 *
 * @module dsh-skillbox/tool-contract
 */

/** Wire names of the tools this plugin owns. */
export const TOOL_PENDING = 'skillbox_pending'
export const TOOL_DECIDE = 'skillbox_decide'

/** Fields every tool result shares, so a renderer can rely on their presence. */
const COMMON = {
  name: { type: 'string', required: true },
  state: { type: 'string', required: true },
}

/** JSON Schema of {@link TOOL_PENDING}'s result. */
export const PENDING_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...COMMON,
    description: { type: 'string', required: true },
    whenToUse: { type: 'string', required: true },
    domain: { type: 'string', required: true },
    familySubject: { type: 'string', required: true },
    recipeLabel: { type: 'string', required: true },
    characters: { type: 'number', required: true },
    seed: { type: 'number', required: true },
    instructions: { type: 'string', required: true },
    waitForDecision: { type: 'boolean', required: true },
  },
}

/** JSON Schema of {@link TOOL_DECIDE}'s parameters. */
export const DECIDE_PARAMETERS = {
  name: { type: 'string', required: true, description: 'skill 名称，必须与待试用 skill 完全一致。' },
}

/** JSON Schema of {@link TOOL_DECIDE}'s result. */
export const DECIDE_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...COMMON,
    kept: { type: 'boolean', required: true },
    message: { type: 'string', required: true },
  },
}

/** Prompt placement: after the repository tool sections, before the tail sections. */
export const PROMPT_SECTION = {
  name: 'plugin:skillbox',
  order: 2950,
}

/** Prompt text the model receives while this plugin is mounted. */
export const PROMPT_TEXT =
  '本会话装有 dsh-skillbox 插件：应用窗口右侧边缘有一个 skillbox 侧边栏，可以生成随机 skill，并控制 skillbox 中每个 skill 的启用状态。' +
  '当一个随机 skill 处于试用状态时，先调用 skillbox_pending 读取它的完整说明，并按该说明完成一次真实任务；' +
  '任务结束后调用 skillbox_decide 让用户在「保留到 skill 包」与「删除该 skill」之间选择，不要替用户决定。'

/** The complete tool catalogue this plugin registers, as data. */
export const TOOL_SCHEMAS = [
  {
    name: TOOL_PENDING,
    description:
      '读取 dsh-skillbox 中等待试用的随机 skill：返回它的名称、简介与完整说明，并要求在本次对话中按该说明执行任务。' +
      '当用户点击了「试用」、或用户提到待试用的随机 skill 时调用。返回后请按 <skill_instructions> 完成一次真实任务，' +
      '最后调用 skillbox_decide 处理「保留到 skill 包 / 删除该 skill」的决策。',
    parameters: {},
    output: PENDING_OUTPUT_SCHEMA,
  },
  {
    name: TOOL_DECIDE,
    description:
      '处理 dsh-skillbox 生成的 skill 的归属决策：保留到 skill 包，或删除该 skill。' +
      '试用结束后必须调用本工具让用户在两个选项中作出选择，不要自行替用户决定。',
    parameters: DECIDE_PARAMETERS,
    output: DECIDE_OUTPUT_SCHEMA,
  },
]
