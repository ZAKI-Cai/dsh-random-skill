/**
 * Random skill generator for dsh-skillbox.
 *
 * Produces a coherent, immediately usable skill bundle: a kebab-case name, a
 * one-line description used as the catalog summary, and a Markdown body with
 * YAML frontmatter that `@deepseek-ai/dsh-skill-filesystem` accepts.
 *
 * @module dsh-skillbox/generator
 */

const ARCHETYPES = [
  {
    id: 'audit',
    label: '审查',
    verb: '审查',
    nouns: ['仓库依赖', '提交记录', '依赖清单', '配置漂移', '日志片段', '表结构', '接口契约', '文案一致性'],
    subjects: ['仓库依赖', '提交历史', '配置文件', '日志片段', '数据库 schema', '接口定义', '多语言文案'],
    deliverable: '按严重程度排序的问题清单',
    steps: [
      '先建立全局清单：枚举需要审查的全部对象，标注每个对象的位置与规模。',
      '逐项核对：把对象与基准（既有约定、文档、上一次审查结论）比对，记录每一处偏离。',
      '分级：把发现按「会立刻出事 / 会逐渐腐烂 / 只是不好看」三档归类，不混档。',
      '给出可执行修复：每条发现必须配一条最小改动建议，写清楚改哪个文件、改成什么。',
    ],
    outputs: ['偏离项 + 位置 + 证据', '风险分级', '最小修复建议', '本次未覆盖的范围（明确写出）'],
    rules: [
      '不确定就标注「待确认」，不要编造证据。',
      '不要顺手重构：审查报告只描述问题与建议，不改动被审查对象。',
    ],
  },
  {
    id: 'refactor',
    label: '重构',
    verb: '重构',
    nouns: ['重复业务逻辑', '超长函数', '模块命名', '隐式耦合', '脆弱测试', '硬编码常量', '条件分支'],
    subjects: ['重复的业务逻辑', '超长函数', '命名不一致的模块', '模块之间的隐式耦合', '硬编码常量'],
    deliverable: '行为等价的重构补丁与前后对比说明',
    steps: [
      '先固定行为：找到或补上能证明当前行为的测试/验收手段，重构期间它必须一直通过。',
      '小步推进：一次只做一种手法（提取函数、内联、改名、搬移），每步之后重新验证。',
      '保持等价：不改变对外行为、日志格式、错误码；若要改，单独拆成另一步并说明。',
      '收尾清理：删掉因重构而失效的死代码与过期注释。',
    ],
    outputs: ['改动文件清单', '每一步的等价性理由', '验证方式与结果', '刻意没做的改动（及原因）'],
    rules: [
      '没有验证手段就不动手，先造验证手段。',
      '一次提交只做一种重构手法，便于回滚。',
    ],
  },
  {
    id: 'doc',
    label: '文档',
    verb: '编写',
    nouns: ['使用手册', '架构说明', '排错指南', '变更日志', '接口文档', '上手指南', '运维手册'],
    subjects: ['一个模块的使用方式', '系统的整体架构', '常见故障与排查路径', '版本变更记录', '对外接口'],
    deliverable: '结构化的 Markdown 文档',
    steps: [
      '先定读者：明确文档写给谁（新同事 / 使用者 / 运维），据此决定详略与术语深度。',
      '先骨架后内容：先写出目录与每节的一句话结论，再逐节填充细节。',
      '例子优先：每个概念至少配一个可复制粘贴的真实例子，例子必须验证过。',
      '标注时效：写明适用版本、最后核对时间，以及已知未覆盖的部分。',
    ],
    outputs: ['目录结构', '正文（含可运行示例）', '适用版本与时效说明', '待补充清单'],
    rules: [
      '不写没验证过的命令与输出。',
      '术语首次出现时给出定义，不要假设读者记得。',
    ],
  },
  {
    id: 'test',
    label: '测试',
    verb: '补测',
    nouns: ['边界条件', '异常路径', '并发场景', '回归用例', '输入校验', '状态机转换'],
    subjects: ['边界与异常输入', '并发与竞态场景', '历史回归缺陷', '对外输入校验'],
    deliverable: '可重复运行的测试用例与失败证据',
    steps: [
      '列等价类：把输入空间划成等价类，每类至少一个代表用例。',
      '优先异常：先覆盖错误路径与边界值，happy path 最后补。',
      '可复现：每个用例必须能独立运行并给出确定的通过/失败结论，不依赖执行顺序。',
      '记录基线：先跑一遍记录当前失败项，区分「本次引入」与「既有缺陷」。',
    ],
    outputs: ['用例清单与覆盖的等价类', '新增测试文件', '当前通过/失败状态', '未覆盖的风险点'],
    rules: [
      '测试不能依赖真实网络与真实时钟，必要时注入替身。',
      '不为通过而放宽断言；发现既有缺陷单独记录，不静默跳过。',
    ],
  },
  {
    id: 'diagnose',
    label: '诊断',
    verb: '诊断',
    nouns: ['性能瓶颈', '内存增长', '启动失败', '偶发错误', '构建失败', '慢查询', '死锁'],
    subjects: ['性能瓶颈', '内存持续增长', '启动失败', '偶发错误', '构建失败'],
    deliverable: '根因结论 + 证据链 + 修复方案',
    steps: [
      '先立假设：把可能的原因列成不超过 5 条的可证伪假设。',
      '二分定位：用最小复现与逐层排除缩小范围，每次只验证一条假设。',
      '留证据：命令、输出、时间点、版本号都记录下来，结论必须能由证据复现。',
      '给修复：区分「止血」与「根治」，并说明各自的副作用。',
    ],
    outputs: ['现象描述与复现步骤', '假设列表与排除过程', '根因结论', '止血方案与根治方案'],
    rules: [
      '没复现就不下结论，先复现。',
      '改一个变量就重新测一次，不要一次改多处。',
    ],
  },
  {
    id: 'plan',
    label: '规划',
    verb: '拆解',
    nouns: ['迁移方案', '发布计划', '技术选型', '里程碑', '风险登记', '回滚预案'],
    subjects: ['一次技术迁移', '一次版本发布', '一次技术选型', '一个多阶段目标'],
    deliverable: '分阶段执行计划与风险登记表',
    steps: [
      '明确目标与不变量：写清楚达成标准，以及过程中绝不能破坏的东西。',
      '切成可独立验收的阶段：每阶段有明确输入、产出与完成判据。',
      '标风险：为每条风险写出触发信号、影响面与应对动作。',
      '定回滚：每个阶段都要能单独回退，写清回退触发条件。',
    ],
    outputs: ['目标与非目标', '阶段划分与验收判据', '风险登记表', '回滚预案'],
    rules: [
      '不排没有验收标准的阶段。',
      '不为不可逆操作留下模糊措辞，必须写明触发条件。',
    ],
  },
  {
    id: 'format',
    label: '整理',
    verb: '整理',
    nouns: ['散乱笔记', '会议记录', '需求条目', '待办清单', '术语表', '知识碎片'],
    subjects: ['散乱的原始笔记', '会议记录', '零散的需求描述', '术语混用的文档'],
    deliverable: '统一格式、可检索的结构化结果',
    steps: [
      '先归档：把原始材料按主题分组，不删任何信息，只做归类。',
      '统一粒度：同一层级的条目保持同一抽象层次，避免深浅混排。',
      '去重合并：合并语义重复的条目，保留最早出处与全部差异点。',
      '补索引：给出可跳转的目录与关键词索引。',
    ],
    outputs: ['结构化正文', '合并/去重记录', '原始材料索引', '存疑条目'],
    rules: [
      '整理不等于删减：无法判断归属的内容进「存疑」而不是丢弃。',
      '保持可追溯：每条结论都要能指回原始材料。',
    ],
  },
  {
    id: 'release',
    label: '发布',
    verb: '准备',
    nouns: ['发布检查单', '变更说明', '版本号策略', '灰度方案', '升级指引', '回归清单', '发布公告'],
    subjects: ['一次正式发布', '一次热修复', '一次大版本升级'],
    deliverable: '发布检查单与对外变更说明',
    steps: [
      '冻结范围：明确本次发布包含与不包含的改动。',
      '过检查单：逐条确认构建、测试、回滚、通知四类前置条件。',
      '写变更说明：按「新增 / 变更 / 修复 / 已知问题」分类面向使用者表述。',
      '定灰度与回滚：写明观察指标、阈值与回滚触发条件。',
    ],
    outputs: ['发布检查单（逐条状态）', '变更说明', '灰度与观察指标', '回滚步骤'],
    rules: [
      '检查单有任何未确认项就不进入发布。',
      '变更说明面向使用者，不写内部实现流水账。',
    ],
  },
]

const QUALIFIERS = [
  '要快',
  '要稳',
  '要全',
  '要省',
  '要能交代清楚',
  '要能交给别人接手',
]

const INTENSIFIERS = ['严格', '保守', '务实', '极简']

function pick(list, random) {
  return list[Math.floor(random() * list.length)]
}

function pickMany(list, count, random) {
  const pool = [...list]
  const out = []
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(random() * pool.length), 1)[0])
  }
  return out
}

function kebab(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Language pools for the second half of a skill name. */
const EN_TAILS = [
  'audit', 'checklist', 'playbook', 'review', 'sweep', 'ledger', 'pass', 'scan',
  'desk', 'kit', 'lens', 'report', 'trace', 'guard', 'brief', 'digest',
]

/**
 * Generate one random skill.
 *
 * @param options - generation options.
 * @param options.random - deterministic random source in `[0, 1)`, defaults to `Math.random`.
 * @param options.taken - names already used in the target skillbox; the generator retries to avoid collisions.
 * @returns the generated skill: `{ name, description, body, whenToUse, archetype }`.
 */
export function generateSkill(options = {}) {
  const random = options.random ?? Math.random
  const taken = new Set(options.taken ?? [])

  for (let attempt = 0; attempt < 64; attempt += 1) {
    const archetype = pick(ARCHETYPES, random)
    const noun = pick(archetype.nouns, random)
    const qualifier = pick(QUALIFIERS, random)
    const intensifier = pick(INTENSIFIERS, random)
    const tail = pick(EN_TAILS, random)
    const steps = pickMany(archetype.steps, Math.min(archetype.steps.length, 3 + Math.floor(random() * 2)), random)
    const outputs = pickMany(archetype.outputs, Math.min(archetype.outputs.length, 2 + Math.floor(random() * 2)), random)
    const rules = pickMany(archetype.rules, archetype.rules.length, random)

    const name = kebab(`${archetype.id}-${tail}-${Math.floor(random() * 9000 + 1000)}`)
    if (taken.has(name)) continue

    const description = `${archetype.verb}${noun}：${qualifier}，产出${archetype.deliverable}。`
    const whenToUse = `当任务涉及${pick(archetype.subjects, random)}，或用户要求${archetype.verb}${noun}时使用。`

    const body = [
      '---',
      `name: ${name}`,
      `description: ${description}`,
      `whenToUse: ${whenToUse}`,
      'user-invocable: true',
      '---',
      '',
      `# ${archetype.verb}${noun}`,
      '',
      description,
      '',
      '## 工作方式',
      '',
      `以「${intensifier}」风格执行：${qualifier}。`,
      '',
      '## 步骤',
      '',
      ...steps.map((step, index) => `${index + 1}. ${step}`),
      '',
      '## 产出',
      '',
      ...outputs.map((item) => `- ${item}`),
      '',
      '## 约束',
      '',
      ...rules.map((item) => `- ${item}`),
      '',
      `- 全程遵守：${qualifier}。`,
      '',
    ].join('\n')

    return {
      name,
      description,
      whenToUse,
      body,
      archetype: archetype.id,
      archetypeLabel: archetype.label,
    }
  }

  throw new Error('skillbox: 无法生成不重名的 skill，请先清理 skillbox')
}
