/**
 * Random skill generator.
 *
 * A generated skill is composed from three random draws:
 *
 * 1. a **domain family** (domains.js) — the discipline, its subject, its objects of
 *    work, its terminology, its hard rules and its failure modes;
 * 2. a **recipe** (recipes.js) — the universal spine: procedure, evidence bar,
 *    output contract and completion gates;
 * 3. a **draw** — the specific scope, audience, deliverable, parameters and jargon
 *    subset that make this one skill narrower than its family.
 *
 * The result is a self-contained `SKILL.md` that names its trigger, its inputs, its
 * ordered procedure, its hard constraints, its required output fields, its quality
 * gates, its failure modes and its escalation rules — specific enough to be
 * followed literally, narrow enough that the reader knows when it does not apply.
 *
 * @module dsh-skillbox/generator
 */

import { DOMAINS } from './domains.js'
import { RECIPES } from './recipes.js'

/** Word count a generated document must reach to be accepted. */
export const MIN_DOCUMENT_CHARS = 1100

/**
 * The authoring window a generation is allowed to occupy, surfaced to the client so
 * the progress indicator matches the work rather than inventing it.
 */
export const AUTHORING_WINDOW = { selectMinMs: 5000, selectMaxMs: 10000, authorMinMs: 60000, authorMaxMs: 420000 }

/** Qualifiers that steer the working style, drawn per skill. */
const STYLES = [
  { id: 'strict', label: '从严', clause: '宁缺毋滥：证据不足时降级结论，而不是补全结论。' },
  { id: 'conservative', label: '保守', clause: '优先选择可逆、可回退的做法；激进方案必须单独列出并写明代价。' },
  { id: 'pragmatic', label: '务实', clause: '以能在有限时间内交付为准，明确写出被放弃的完备性。' },
  { id: 'minimal', label: '精简', clause: '只保留能改变操作的信息，删去其余字句。' },
  { id: 'exhaustive', label: '穷尽', clause: '穷尽清单中的每一项，逐项给出结论，不允许合并省略。' },
  { id: 'transferable', label: '可交接', clause: '按「别人拿着这份文档就能接手」的标准写，隐含前提必须显式化。' },
]

/** Name tails, kept short so the kebab-case name stays readable. */
const NAME_TAILS = ['sop', 'guide', 'desk', 'kit', 'playbook', 'sheet', 'brief', 'lens', 'check', 'flow']

function pick(list, random) {
  return list[Math.floor(random() * list.length)]
}

function pickMany(list, count, random) {
  const pool = [...list]
  const out = []
  const take = Math.max(0, Math.min(count, pool.length))
  while (out.length < take) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0])
  return out
}

/** Every family in the catalog, paired with the domain that owns it. */
export function families() {
  return DOMAINS.flatMap((domain) =>
    domain.families.map((family) => ({
      domainId: domain.id,
      domainLabel: domain.label,
      family,
    })),
  )
}

/** The catalogue as a compact summary, for diagnostics and documentation. */
export function catalogue() {
  return DOMAINS.map((domain) => ({
    id: domain.id,
    label: domain.label,
    en: domain.en,
    families: domain.families.map((family) => ({
      id: family.id,
      subject: family.subject,
      recipes: family.recipes,
      scopes: family.scopes.length,
      objects: family.objects.length,
    })),
  }))
}

/** How many distinct (family, recipe) combinations the generator can draw. */
export function combinationCount() {
  return families().reduce((total, entry) => total + entry.family.recipes.length, 0)
}

/** Render `{key}` placeholders from the assembly values. */
function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const value = values[key]
    if (value === undefined) return `{${key}}`
    return Array.isArray(value) ? value.join('、') : String(value)
  })
}

/** Flatten several lists into one. */
function gather(...lists) {
  return lists.flat().filter((entry) => entry !== undefined && entry !== null && entry !== '')
}

function bullet(lines) {
  return lines.map((line) => `- ${line}`)
}

function numbered(lines) {
  return lines.map((line, index) => `${index + 1}. ${line}`)
}

function tableRow(cells) {
  return `| ${cells.join(' | ')} |`
}

/**
 * Compose the document body of one generated skill.
 *
 * @param assembly - the drawn domain, family, recipe and draw values.
 * @returns the full `SKILL.md` text.
 */
function composeBody(assembly) {
  const { name, description, whenToUse, domain, family, recipe, draw } = assembly
  const values = {
    subject: family.subject,
    focus: family.focus,
    objects: draw.objects,
    evidence: draw.evidence,
    outputs: draw.outputs,
    guardrails: draw.guardrails,
    gates: draw.gates,
    params: draw.params,
    jargon: draw.jargon,
    pitfalls: draw.pitfalls,
    scopes: draw.scopes,
  }

  const title = `${domain.label}·${family.subject}｜${recipe.label}`
  const steps = recipe.steps.map((step) => fill(step, values))
  const evidence = gather(draw.evidence, recipe.evidence)
  const outputs = gather(draw.outputs, recipe.outputs)
  const guardrails = gather(family.rules, recipe.guardrails)
  const gates = gather(draw.gates, recipe.gates)
  const pitfalls = draw.pitfalls
  const jargon = draw.jargon

  return [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    `whenToUse: ${whenToUse}`,
    'user-invocable: true',
    '---',
    '',
    `# ${title}`,
    '',
    description,
    '',
    '## 适用与不适用',
    '',
    `**适用**：任务落在「${draw.scope}」范围内，且需要产出${draw.deliverable}。`,
    `**不适用**：只需要常识性回答；或所需的 ${draw.objects.join('、')} 缺失且无法补齐 —— 此时先按第九节处理，不要开始执行。`,
    `**工作风格**：${draw.style.label} —— ${draw.style.clause}`,
    '',
    '## 一、先读这一条',
    '',
    `本 skill 的重点是：${family.focus}。`,
    '做不到这一点，本次产出即视为未完成 —— 其他部分写得再完整也不能替代它。',
    '',
    '## 二、何时触发',
    '',
    ...bullet([
      `任务涉及 ${draw.scopes.join('、')}。`,
      `用户要求${recipe.verb}${family.subject}，或要求产出${draw.deliverable}。`,
      `需要处理 ${draw.objects.join('、')} 这类对象，并且要给出可复核的结论。`,
      `出现了「${jargon.slice(0, 3).join('」「')}」这类必须严格区分的概念，含糊表述会造成实际后果。`,
    ]),
    '',
    '## 三、动手之前',
    '',
    ...numbered([
      `确认对象：本次要处理的 ${draw.objects.join('、')} 是否齐全？缺哪一项、由谁提供、什么时候能给 —— 先写清楚再开始。`,
      `确认口径：${draw.params.join('、')} 各自取值多少？取值来源是什么？口径不一致的数据不得直接比较。`,
      `确认读者：产出交付给${draw.audience}，据此决定详略与术语深度。`,
      '确认边界：明确写出本次不涉及的范围，避免顺手延伸导致结论超出证据。',
    ]),
    '',
    '> 以上四项有任何一项无法回答时先问清楚；不得用假设填补，必要的假设必须显式写在产出里。',
    '',
    '## 四、执行步骤',
    '',
    ...numbered(steps),
    '',
    '## 五、硬约束（不得违反）',
    '',
    ...bullet(guardrails),
    ...bullet([`全过程遵守「${draw.style.label}」：${draw.style.clause}`]),
    '',
    '## 六、产出必须包含',
    '',
    ...bullet(outputs),
    '',
    `面向${draw.audience}表述：先给结论，再给依据；不使用「大概」「应该是」这类无法追责的措辞。`,
    '',
    '## 七、质量闸门（逐条自查后才算完成）',
    '',
    '| # | 检查项 | 不通过时怎么办 |',
    '|---|---|---|',
    ...gates.map((gate, index) =>
      tableRow([String(index + 1), gate, '先补证据；补不到就把结论降级，并写明降级原因']),
    ),
    '',
    '## 八、术语与常见错误',
    '',
    '本领域术语必须按下表使用，同义混用视为不合格。',
    '',
    '| 术语 | 含义要点 |',
    '|---|---|',
    ...jargon.map((term) =>
      tableRow([`\`${term}\``, `${family.subject}语境下的严格含义；与日常用语的差别必须在此处对齐`]),
    ),
    '',
    '**常见错误（出现即返工）**：',
    '',
    ...bullet(pitfalls),
    '',
    '## 九、失败处理与升级',
    '',
    ...numbered([
      '证据不足：先缩小结论范围，而不是降低证据标准；缩小后的结论要写明适用范围。',
      `口径冲突：以${draw.audience}认可的规范为准，把冲突双方与取舍理由一并写进产出。`,
      '对象缺失：列出缺失项、影响面与补齐方式，并给出「补齐后需重做哪几步」的判断；不猜数据。',
      '结果与预期不符：原样记录现象，最小化复现条件，再给推断；不得先定结论再找理由。',
      '超出本 skill 范围：明确写出「这需要另一类工作」，给出下一步该做什么，不在本 skill 里硬做。',
    ]),
    '',
    '## 十、依据与延伸',
    '',
    ...bullet([
      ...evidence.map((item) => `证据类型：${item}`),
      `风格要求：${draw.style.label} —— ${draw.style.clause}`,
    ]),
    '',
    '---',
    '',
    `生成信息：领域 ${domain.label}（${domain.en}） / 任务族 ${family.id} / 方案 ${recipe.id} / 抽取编号 ${draw.drawId}`,
    '',
  ].join('\n')
}

/**
 * Generate one random skill.
 *
 * @param options - generation options.
 * @param options.random - deterministic random source in `[0, 1)`, defaults to `Math.random`.
 * @param options.taken - names already used; the generator retries to avoid collisions.
 * @param options.domainId - restrict the draw to one domain.
 * @param options.familyId - restrict the draw to one family.
 * @returns the generated skill and its metadata.
 */
export function generateSkill(options = {}) {
  const random = options.random ?? Math.random
  const taken = new Set(options.taken ?? [])
  const pool = families().filter(
    (entry) =>
      (options.domainId === undefined || entry.domainId === options.domainId) &&
      (options.familyId === undefined || entry.family.id === options.familyId),
  )
  if (pool.length === 0) throw new Error('skillbox: 没有匹配的领域/任务族可用于生成')

  for (let attempt = 0; attempt < 64; attempt += 1) {
    const { domainId, family } = pick(pool, random)
    const domain = DOMAINS.find((entry) => entry.id === domainId)
    const recipeId = pick(family.recipes, random)
    const recipe = RECIPES.find((entry) => entry.id === recipeId)

    const draw = {
      drawId: Math.floor(random() * 9000 + 1000),
      scope: pick(family.scopes, random),
      audience: pick(family.audiences, random),
      deliverable: pick(family.deliverables, random),
      style: pick(STYLES, random),
      objects: pickMany(family.objects, 3, random),
      evidence: pickMany(family.evidence, 3, random),
      outputs: pickMany(family.deliverables, 2, random),
      guardrails: pickMany(family.rules, family.rules.length, random),
      // Keyed as `gates` so the recipe templates' `{gates}` placeholder resolves.
      gates: pickMany(family.qualityGates, family.qualityGates.length, random),
      params: pickMany(family.params, 3, random),
      jargon: pickMany(family.jargon, 5, random),
      pitfalls: pickMany(family.pitfalls, family.pitfalls.length, random),
      scopes: pickMany(family.scopes, 3, random),
    }

    const tail = pick(NAME_TAILS, random)
    const name = `${domainId}-${recipe.id}-${tail}-${draw.drawId}`.toLowerCase()
    if (taken.has(name)) continue

    const description = `${domain.label}·${family.subject}：${draw.scope}的${recipe.label}，面向${draw.audience}产出${draw.deliverable}。`
    const whenToUse = `当任务涉及${draw.scopes.join('、')}，或用户要求${recipe.verb}${family.subject}、需要产出${draw.deliverable}时使用。`

    const assembly = { name, description, whenToUse, domain, family, recipe, draw }
    const body = composeBody(assembly)
    const validation = validateSkill({ name, description, whenToUse, body })
    const registeredAt = Date.now()

    return {
      name,
      description,
      whenToUse,
      body,
      domain: domain.id,
      domainLabel: domain.label,
      family: family.id,
      familySubject: family.subject,
      recipe: recipe.id,
      recipeLabel: recipe.label,
      scope: draw.scope,
      audience: draw.audience,
      deliverable: draw.deliverable,
      style: draw.style.id,
      characters: body.length,
      registeredAt,
      validation,
      /** What the browser half shows while the authoring window is open. */
      topic: {
        domain: domain.label,
        familySubject: family.subject,
        recipe: recipe.label,
        scope: draw.scope,
        deliverable: draw.deliverable,
        audience: draw.audience,
        style: draw.style.label,
        codeName: `${domain.en}-${recipe.id}-${draw.drawId}`,
      },
      /** The window the client is allowed to present as topic selection / authoring. */
      window: AUTHORING_WINDOW,
    }
  }

  throw new Error('skillbox: 无法生成不重名的 skill，请先清理 skillbox')
}

/**
 * Check that a generated document is specific enough to be followed literally.
 *
 * The checks mirror what a reader notices immediately: a named trigger, ordered
 * procedure steps, a hard-constraint section, a required-output section, a
 * completion-gate table, a terminology table, failure handling, and enough
 * substance to not be a summary.
 *
 * @param skill - `{ name, description, whenToUse, body }`.
 * @returns `{ ok, characters, problems, checks }`.
 */
export function validateSkill(skill) {
  const body = skill.body ?? ''
  const checks = [
    { id: 'name', ok: /^[a-z0-9][a-z0-9-]*$/.test(skill.name ?? ''), detail: 'kebab-case 名称' },
    { id: 'description', ok: (skill.description ?? '').length >= 20, detail: '说明不少于 20 字' },
    { id: 'frontmatter', ok: /^---\n[\s\S]*?\n---\n/.test(body), detail: '带 YAML frontmatter' },
    { id: 'trigger', ok: body.includes('## 二、何时触发'), detail: '写明触发条件' },
    { id: 'prerequisites', ok: body.includes('## 三、动手之前'), detail: '写明前置确认' },
    { id: 'procedure', ok: (body.match(/^\d+\. /gm) ?? []).length >= 8, detail: '有序步骤不少于 8 条' },
    { id: 'constraints', ok: body.includes('## 五、硬约束'), detail: '有硬约束章节' },
    { id: 'outputs', ok: body.includes('## 六、产出必须包含'), detail: '有产出清单' },
    { id: 'gates', ok: body.includes('| # | 检查项 | 不通过时怎么办 |'), detail: '有质量闸门表' },
    { id: 'jargon', ok: body.includes('| 术语 | 含义要点 |'), detail: '有术语表' },
    { id: 'escalation', ok: body.includes('## 九、失败处理与升级'), detail: '有失败处理与升级' },
    { id: 'filled', ok: !/\{[a-zA-Z]+\}/.test(body), detail: '没有未填充的模板占位符' },
    { id: 'substance', ok: body.length >= MIN_DOCUMENT_CHARS, detail: `正文不少于 ${MIN_DOCUMENT_CHARS} 字` },
  ]
  const problems = checks.filter((check) => !check.ok).map((check) => check.detail)
  return { ok: problems.length === 0, characters: body.length, problems, checks }
}
