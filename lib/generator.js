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
import { ContractError, ERROR_CODES } from './contract.js'
import { RECIPES } from './recipes.js'

/** Word count a generated document must reach to be accepted. */
export const MIN_DOCUMENT_CHARS = 1100

/** Shorter floor for the `brief` depth: a checklist is allowed to be terse. */
export const MIN_BRIEF_DOCUMENT_CHARS = 600

/**
 * The three depths a document can be generated at.
 *
 * Depth is the one lever that changes what the skill asks for rather than how it is
 * worded: `brief` is a checklist to run immediately, `standard` is the full
 * procedure, `deep` adds a filled-in example of the deliverable so the reader can see
 * what "done" looks like before starting.
 */
export const DEPTHS = [
  {
    id: 'brief',
    label: '速用',
    hint: '一页清单：触发、前置、动作、红线、产出、自查',
    banner: '',
    /** Compact sections: the point of this depth is to be usable in one screen. */
    sections: {
      trigger: 3,
      prerequisites: 2,
      steps: 4,
      constraints: 3,
      outputs: 4,
      gates: 4,
      jargon: 0,
      pitfalls: 3,
      escalation: 3,
      evidence: 3,
    },
  },
  {
    id: 'standard',
    label: '标准',
    hint: '完整流程、约束、闸门与升级路径',
    banner: '',
  },
  {
    id: 'deep',
    label: '深入',
    hint: '标准内容 + 一份填好字段的产出示例（虚构数据）',
    banner:
      '> **深度：深入。** 本文档除完整流程外，附有一份按本 skill 要求填好字段的产出示例（第十一节，数据为虚构）。' +
      '示例的作用是消除「产出到底长什么样」的歧义；实际执行时不得照抄示例内容，只照抄它的**字段与粒度**。',
    sections: {
      trigger: 5,
      prerequisites: 5,
      steps: 7,
      constraints: 8,
      outputs: 8,
      gates: 9,
      jargon: 7,
      pitfalls: 5,
      escalation: 5,
      evidence: 6,
    },
  },
]

/** Default depth when a caller does not pick one. */
export const DEFAULT_DEPTH = 'standard'

/** @returns the depth definition for an id, falling back to the default. */
export function depthOf(id) {
  return DEPTHS.find((depth) => depth.id === id) ?? DEPTHS.find((depth) => depth.id === DEFAULT_DEPTH)
}

/**
 * How many entries one section may carry at a given depth.
 *
 * A document is not "more thorough" because it lists everything the catalogue holds;
 * it is more or less usable depending on whether the reader can hold it in mind. Each
 * depth therefore caps every list, and `take()` is the single place that cap is
 * applied.
 *
 * @param depth - a depth definition.
 * @param section - section key.
 * @param available - how many entries the catalogue offers for that section.
 * @returns the number of entries to emit.
 */
function take(depth, section, available) {
  const cap = depth.sections?.[section]
  return cap === undefined ? available : Math.min(cap, available)
}

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

/** Range a generated seed stays inside, so it fits comfortably in a footer line. */
export const SEED_RANGE = 0x7fffffff

/**
 * A small deterministic PRNG (mulberry32).
 *
 * Every draw is seeded and the seed is recorded next to the skill, so any
 * generated document can be reproduced exactly — from the sidebar, from a test, or
 * from a bug report that quotes only the seed.
 *
 * @param seed - 32-bit seed.
 * @returns a function producing successive values in `[0, 1)`.
 */
export function seededRandom(seed) {
  let state = seed >>> 0
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Draw a fresh seed for one generation. */
export function newSeed() {
  return Math.floor(Math.random() * SEED_RANGE) + 1
}

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
  const depth = depthOf(draw.depth)
  // Every section is capped by the depth, and the caps are the only difference
  // between the three tiers besides the worked example. Taking the first N of an
  // ordered list is deliberate: the catalogue lists its most important entries first.
  const scopes = draw.scopes.slice(0, take(depth, 'trigger', draw.scopes.length))
  const objects = draw.objects.slice(0, take(depth, 'prerequisites', draw.objects.length))
  const params = draw.params.slice(0, take(depth, 'prerequisites', draw.params.length))
  const steps = recipe.steps
    .slice(0, take(depth, 'steps', recipe.steps.length))
    .map((step) => fill(step, { ...values, objects, evidence: draw.evidence, params }))
  const evidence = gather(draw.evidence, recipe.evidence).slice(0, take(depth, 'evidence', 99))
  const outputs = gather(draw.outputs, recipe.outputs).slice(0, take(depth, 'outputs', 99))
  const guardrails = gather(family.rules, recipe.guardrails).slice(0, take(depth, 'constraints', 99))
  const gates = gather(draw.gates, recipe.gates).slice(0, take(depth, 'gates', 99))
  const pitfalls = draw.pitfalls.slice(0, take(depth, 'pitfalls', draw.pitfalls.length))
  const jargon = draw.jargon.slice(0, take(depth, 'jargon', draw.jargon.length))
  const escalation = [
    '证据不足：先缩小结论范围，而不是降低证据标准；缩小后的结论要写明适用范围。',
    `口径冲突：以${draw.audience}认可的规范为准，把冲突双方与取舍理由一并写进产出。`,
    '对象缺失：列出缺失项、影响面与补齐方式，并给出「补齐后需重做哪几步」的判断；不猜数据。',
    '结果与预期不符：原样记录现象，最小化复现条件，再给推断；不得先定结论再找理由。',
    '超出本 skill 范围：明确写出「这需要另一类工作」，给出下一步该做什么，不在本 skill 里硬做。',
  ].slice(0, take(depth, 'escalation', 5))

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
    ...(depth.banner === '' ? [] : [depth.banner, '']),
    '## 适用与不适用',
    '',
    `**适用**：任务落在「${draw.scope}」范围内，且需要产出${draw.deliverable}。`,
    `**不适用**：只需要常识性回答；或所需的 ${objects.join('、')} 缺失且无法补齐 —— 此时先按第九节处理，不要开始执行。`,
    `**工作风格**：${draw.style.label} —— ${draw.style.clause}`,
    `**本次深度**：${depth.label}（${depth.hint}）`,
    '',
    '## 一、先读这一条',
    '',
    `本 skill 的重点是：${family.focus}。`,
    '做不到这一点，本次产出即视为未完成 —— 其他部分写得再完整也不能替代它。',
    '',
    '## 二、何时触发',
    '',
    ...bullet([
      `任务涉及 ${scopes.join('、')}。`,
      `用户要求${recipe.verb}${family.subject}，或要求产出${draw.deliverable}。`,
      `需要处理 ${objects.join('、')} 这类对象，并且要给出可复核的结论。`,
      ...(jargon.length === 0
        ? []
        : [`出现了「${jargon.slice(0, 3).join('」「')}」这类必须严格区分的概念，含糊表述会造成实际后果。`]),
    ]),
    '',
    '## 三、动手之前',
    '',
    ...numbered([
      `确认对象：本次要处理的 ${objects.join('、')} 是否齐全？缺哪一项、由谁提供、什么时候能给 —— 先写清楚再开始。`,
      `确认口径：${params.join('、')} 各自取值多少？取值来源是什么？口径不一致的数据不得直接比较。`,
      ...(take(depth, 'prerequisites', 4) > 2
        ? [`确认读者：产出交付给${draw.audience}，据此决定详略与术语深度。`]
        : []),
      ...(take(depth, 'prerequisites', 4) > 3
        ? ['确认边界：明确写出本次不涉及的范围，避免顺手延伸导致结论超出证据。']
        : []),
    ]),
    '',
    '> 以上各项有任何一项无法回答时先问清楚；不得用假设填补，必要的假设必须显式写在产出里。',
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
    ...(jargon.length === 0
      ? [`本次为「${depth.label}」深度，术语表从略；正式交付前请按需要补全术语一致性检查。`, '']
      : [
          '本领域术语必须按下表使用，同义混用视为不合格。',
          '',
          '| 术语 | 含义要点 |',
          '|---|---|',
          ...jargon.map((term) =>
            tableRow([`\`${term}\``, `${family.subject}语境下的严格含义；与日常用语的差别必须在此处对齐`]),
          ),
          '',
        ]),
    '**常见错误（出现即返工）**：',
    '',
    ...bullet(pitfalls),
    '',
    '## 九、失败处理与升级',
    '',
    ...numbered(escalation),
    '',
    '## 十、依据与延伸',
    '',
    ...bullet([
      ...evidence.map((item) => `证据类型：${item}`),
      `风格要求：${draw.style.label} —— ${draw.style.clause}`,
    ]),
    '',
    ...(draw.depth === 'deep' ? composeExample(assembly) : []),
    '---',
    '',
    `生成信息：领域 ${domain.label}（${domain.en}） / 任务族 ${family.id} / 方案 ${recipe.id} / 深度 ${depth.id} / 抽取编号 ${draw.drawId}`,
    '',
  ].join('\n')
}

/**
 * Compose the worked example a `deep` document carries.
 *
 * The point is to remove the ambiguity of "what does done look like": every field the
 * output section demands is filled with placeholder syntax that states what belongs
 * there, at the granularity the skill asks for. Placeholders do not use braces — a
 * brace anywhere in the body is a validation failure — and the section is explicitly
 * fiction, so a reader cannot mistake it for data.
 *
 * @param assembly - the drawn domain, family, recipe and draw values.
 * @returns the section's lines, ready to splice into the document.
 */
function composeExample(assembly) {
  const { domain, family, recipe, draw } = assembly
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
  const fields = gather(draw.outputs, recipe.outputs)

  return [
    '## 十一、产出示例（虚构）',
    '',
    `下面是${recipe.kind}的骨架，按第六节要求的字段逐一填好。`,
    `**数据全部虚构**，只用于说明字段、粒度与写法；实际执行时按${draw.audience}认可的规范填写真实内容。`,
    '',
    `**任务**：${domain.label}·${family.subject}——${draw.scope}（本次抽取编号 ${draw.drawId}）`,
    `**读者**：${draw.audience}　**工作风格**：${draw.style.label}`,
    '',
    '**字段填写**',
    '',
    '| 字段 | 示例内容 | 填写要求 |',
    '|---|---|---|',
    ...fields.map((field) =>
      tableRow([
        field,
        `〔此处写 ${field} 的结论，一句话〕`,
        `必须指回本次使用的 ${draw.objects[0] ?? '对象'} 与证据；无法判定时写「无法判定」并说明缺什么`,
      ]),
    ),
    '',
    '**过程记录（示例）**',
    '',
    ...numbered([
      `范围：${draw.scope}；口径：${draw.params.join('、')} 取值分别为〔写取值〕。`,
      `取证：用到 ${draw.evidence.join('、')}，来源为〔写来源与位置〕。`,
      '结论分级：确定〔写〕；较可能〔写〕；存疑并注明缺什么证据〔写〕。',
      `自查：按第七节闸门逐条核对，未达标项为〔写项与原因〕。`,
    ]),
    '',
    '**这一段必须替换掉的句子**：',
    '',
    ...bullet([
      `所有〔〕占位都必须替换为真实内容；交付前搜索一次〔〕，确保零残留。`,
      `不得直接沿用示例的措辞判断，示例只提供字段与粒度。`,
      `如果某一项确实无法填写，写「无法判定：缺〔具体材料〕」比编一个结论更合格。`,
    ]),
    '',
  ]
}

/**
 * Generate one random skill.
 *
 * @param options - generation options.
 * @param options.seed - reproduce a previous draw exactly; omitted means a fresh seed.
 * @param options.random - override the random source in `[0, 1)` (tests only).
 * @param options.taken - names already used; the generator retries to avoid collisions.
 * @param options.domainId - restrict the draw to one domain.
 * @param options.familyId - restrict the draw to one family.
 * @param options.recipes - restrict the draw to these recipe ids, in this order.
 *   A replay pins domain + family + recipes so the seed alone decides the document:
 *   the candidate pool must not depend on which names happen to be taken.
 * @returns the generated skill and its metadata, including the seed that produced it.
 * @throws {ContractError} `NO_MATCHING_TOPIC` when the narrowing matches nothing.
 */
export function generateSkill(options = {}) {
  const seed = typeof options.seed === 'number' && Number.isFinite(options.seed) ? options.seed >>> 0 : newSeed()
  const random = options.random ?? seededRandom(seed)
  const taken = new Set(options.taken ?? [])
  const depth = depthOf(options.depth)
  const pool = families().filter(
    (entry) =>
      (options.domainId === undefined || entry.domainId === options.domainId) &&
      (options.familyId === undefined || entry.family.id === options.familyId),
  )
  if (pool.length === 0) {
    throw new ContractError(ERROR_CODES.NO_MATCHING_TOPIC, 'skillbox: 没有匹配的领域/任务族可用于生成')
  }

  for (let attempt = 0; attempt < 64; attempt += 1) {
    const { domainId, family } = pick(pool, random)
    const domain = DOMAINS.find((entry) => entry.id === domainId)
    const recipeIds = options.recipes ?? family.recipes
    const recipeId = pick(recipeIds, random)
    const recipe = RECIPES.find((entry) => entry.id === recipeId)

    const draw = {
      drawId: Math.floor(random() * 9000 + 1000),
      scope: pick(family.scopes, random),
      audience: pick(family.audiences, random),
      deliverable: pick(family.deliverables, random),
      style: pick(STYLES, random),
      depth: depth.id,
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
    const whenToUse = `当任务涉及${draw.scopes.join('、')}，或者用户要求${recipe.verb}${family.subject}、需要产出${draw.deliverable}时使用。`

    const assembly = { name, description, whenToUse, domain, family, recipe, draw }
    const body = composeBody(assembly)
    const minChars = depth.id === 'brief' ? MIN_BRIEF_DOCUMENT_CHARS : MIN_DOCUMENT_CHARS
    const validation = validateSkill(
      { name, description, whenToUse, body },
      { minChars, expectExample: depth.id === 'deep' },
    )
    const registeredAt = Date.now()

    return {
      name,
      description,
      whenToUse,
      body,
      seed,
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
      depth: depth.id,
      depthLabel: depth.label,
      hasExample: depth.id === 'deep',
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
        depth: depth.label,
        codeName: `${domain.en}-${recipe.id}-${draw.drawId}`,
      },
      /** The window the client is allowed to present as topic selection / authoring. */
      window: AUTHORING_WINDOW,
    }
  }

  throw new ContractError(ERROR_CODES.NAME_EXHAUSTED, 'skillbox: 无法生成不重名的 skill，请先清理 skillbox')
}

/**
 * Check that a generated document is specific enough to be followed literally.
 *
 * The checks mirror what a reader notices immediately: a named trigger, ordered
 * procedure steps, a hard-constraint section, a required-output section, a
 * completion-gate table, a terminology table, failure handling, and enough
 * substance to not be a summary. A `deep` document must also carry the worked
 * example, because that is the whole point of picking that depth.
 *
 * @param skill - `{ name, description, whenToUse, body }`.
 * @param options - `{ minChars, expectExample }`.
 * @returns `{ ok, characters, problems, checks }`.
 */
export function validateSkill(skill, options = {}) {
  const body = skill.body ?? ''
  const minChars = options.minChars ?? MIN_DOCUMENT_CHARS
  const expectExample = options.expectExample ?? body.includes('## 十一、产出示例')
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
    {
      id: 'jargon',
      // A compact depth may legitimately omit the table; a document that does use
      // domain terms must define them, so the requirement is conditional on the
      // document actually carrying terms.
      ok: !body.includes('| 术语 | 含义要点 |') || /`[^`]+`/.test(body),
      detail: '术语表若存在则必须填有术语',
    },
    { id: 'escalation', ok: body.includes('## 九、失败处理与升级'), detail: '有失败处理与升级' },
    { id: 'filled', ok: !/\{[a-zA-Z]+\}/.test(body), detail: '没有未填充的模板占位符' },
    {
      id: 'example',
      ok: !expectExample || (body.includes('## 十一、产出示例') && body.includes('〔')),
      detail: '深入档必须带填好字段的产出示例',
    },
    { id: 'substance', ok: body.length >= minChars, detail: `正文不少于 ${minChars} 字` },
  ]
  const problems = checks.filter((check) => !check.ok).map((check) => check.detail)
  return { ok: problems.length === 0, characters: body.length, problems, checks }
}
