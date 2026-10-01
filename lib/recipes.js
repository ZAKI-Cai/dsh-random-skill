/**
 * Recipe knowledge for the random skill generator.
 *
 * A recipe is the universal spine of a skill document: what kind of work it does,
 * the procedure it runs, the evidence bar it holds, and the shape of its output.
 * It is deliberately discipline-neutral — the generator interleaves it with a
 * domain family (see domains.js) so the same spine serves every discipline.
 *
 * Every procedure step is written so that it stays true whichever family it lands
 * in: steps that need discipline vocabulary use the `{…}` placeholders the
 * generator fills from the family.
 *
 * @module dsh-skillbox/recipes
 */

/** @typedef {import('./domains.js').RecipeId} RecipeId */

/**
 * @typedef {object} Recipe
 * @property {RecipeId} id
 * @property {string} label          Chinese verb phrase for the work.
 * @property {string} verb           verb used in generated titles.
 * @property {string} kind           noun for what the skill produces.
 * @property {string[]} steps        procedure steps, in order.
 * @property {string[]} evidence     what counts as proof, on top of the family's.
 * @property {string[]} outputs      required output fields, on top of the family's.
 * @property {string[]} guardrails   process-level constraints.
 * @property {string[]} gates        completion checks, on top of the family's.
 */

/** @type {Recipe[]} */
export const RECIPES = [
  {
    id: 'analyze',
    label: '分析',
    verb: '分析',
    kind: '分析报告',
    steps: [
      '先固定边界：写清本次要分析的 {objects} 范围、时间窗口与判断标准；范围外的内容一律标注为「本次不涉及」，不做顺手延伸。',
      '再建立清单：把范围内的全部 {objects} 逐项列成可勾选的表，每项标明来源与位置，确保没有静默遗漏。',
      '逐项取证：对每一 {objects} 收集 {evidence}，把「观察到的事实」与「由事实推出的判断」分成两栏记录，不得混写。',
      '交叉核对：用至少两种独立来源或方法验证关键结论；只依赖单一来源的结论必须降级为「待确认」并写明缺什么证据。',
      '给出分级：按「确定 / 较可能 / 存疑」三档给出结论，每档写明判定依据；不允许出现无档位的结论。',
      '收束影响：说明每条结论如果成立会改变什么决策，以及它的适用边界在哪里。',
    ],
    evidence: ['两条以上相互独立的来源', '判断与事实的分栏记录'],
    outputs: ['范围声明', '逐项结论及其档位', '证据与出处', '适用边界', '未覆盖部分'],
    guardrails: [
      '先描述后判断：任何判断句都必须能指回前面已经写出的事实。',
      '不确定就写「待确认」，并写清需要补哪一份材料才能确认。',
      '不得为了结论完整而补造证据。',
    ],
    gates: ['范围声明存在且具体', '每条结论都有档位与依据', '未覆盖部分被写出而不是省略'],
  },
  {
    id: 'design',
    label: '方案设计',
    verb: '设计',
    kind: '方案',
    steps: [
      '先写目标与非目标：用一句话说清要达成什么，再列出本次明确不做的事，防止方案无限膨胀。',
      '列出约束：把 {params} 等硬约束逐条写下，并标注哪些是必须满足、哪些可以谈。',
      '给出至少两个候选方案：每个方案写清 {objects} 的处理方式、代价、风险与失效条件。',
      '横向比较：用同一组维度（代价、可逆性、风险、维护成本）比较候选方案，不换维度。',
      '选定并说明理由：明确选哪一个，并写出被放弃方案在什么条件下会重新变成更优选择。',
      '补回退路径：设计能单独撤销的步骤，写清回退的触发条件与操作。',
    ],
    evidence: ['约束的出处', '候选方案的代价估算', '回退可行性论证'],
    outputs: ['目标与非目标', '硬约束清单', '候选方案对比', '选定理由与放弃条件', '回退路径'],
    guardrails: [
      '候选方案必须真正不同，不接受同一方案的措辞变体。',
      '每个方案都要写出它会怎么失败。',
      '不可逆的步骤必须单独标注。',
    ],
    gates: ['目标可验收', '至少两个实质不同的方案', '回退路径可执行'],
  },
  {
    id: 'verify',
    label: '核查',
    verb: '核查',
    kind: '核查报告',
    steps: [
      '先定判定标准：写清「通过 / 不通过 / 无法判定」各自的判据，判据必须可观察。',
      '建立待查清单：把 {objects} 全部列出并编号，核查进度以编号推进，避免跳项。',
      '逐项核查取证：对每一项收集 {evidence}，只记录实际看到的内容，不转述他人结论。',
      '记录反例：遇到与预期不符的情况，先原样记录现象，再最小化复现条件，最后才写推断。',
      '给出判定：逐项给出三态判定，不允许出现「基本没问题」这类无判据的表述。',
      '汇总缺口：把无法判定项的缺失证据列成清单，写清获取方式与预计代价。',
    ],
    evidence: ['判定判据原文', '逐项核查记录', '反例的最小复现条件'],
    outputs: ['判定标准', '逐项三态判定', '反例记录', '无法判定项及所需证据'],
    guardrails: [
      '不接受自证：核查所用参考必须独立于被核查对象。',
      '任何「通过」都要写出它凭什么通过。',
      '不把「没发现问题」写成「没有问题」。',
    ],
    gates: ['判据可观察', '每项判定有记录支撑', '无判据结论为零'],
  },
  {
    id: 'teach',
    label: '教学',
    verb: '拆解',
    kind: '教学材料',
    steps: [
      '先定学习者画像：写清读者已有的知识与要补的缺口，据此决定讲什么、不讲什么。',
      '一句话结论先行：每个小节开头先给结论，再给推导；不允许先铺垫背景再给答案。',
      '按台阶推进：把 {subject} 拆成 3 到 5 个台阶，每个台阶只引入一个新概念，并说明它与上一台阶的关系。',
      '每个概念配一个可复现的例子：例子要包含具体输入、判断过程与预期结果，读者能照着做一遍。',
      '设置自检点：每个台阶后给一个能立刻自测的问题，并给出参考答案与常见错法。',
      '标注常见误解：把新手最容易踩的 {pitfalls} 单列一节，说明它为什么错。',
    ],
    evidence: ['可复现示例', '参考答案', '常见错法记录'],
    outputs: ['学习者画像', '台阶划分', '可复现示例', '自检题与答案', '常见误解', '术语表'],
    guardrails: [
      '不假设读者记得上一节的细节，关键处要重复而不是「如前所述」。',
      '例子必须验证过；没验证的例子要明确标注为示意。',
      '术语首次出现即定义，不得循环定义。',
    ],
    gates: ['台阶关系清晰', '示例可复现', '自检点有答案', '术语均已定义'],
  },
  {
    id: 'translate',
    label: '转译',
    verb: '转译',
    kind: '转译说明',
    steps: [
      '先定两条基准：写清源形态与目标形态各自的规范（术语、粒度、格式）。',
      '建立映射表：把 {objects} 逐项对应到目标形态，标注「直接对应 / 需改写 / 无法对应」。',
      '处理无对应项：无法对应的内容不得悄悄丢弃，要写明它在目标形态里由什么承担，或说明为何被舍弃。',
      '保持可追溯：每条转译结果都要能指回源位置，双向可查。',
      '统一术语与风格：按目标规范统一 {jargon} 的写法，列出替换对照。',
      '给出验收方式：写清怎样判断转译是否成功，包括可抽查的抽样比例。',
    ],
    evidence: ['源位置定位', '映射表', '术语替换对照'],
    outputs: ['双端规范', '映射表', '舍弃项及理由', '术语对照', '验收方式'],
    guardrails: [
      '不允许静默丢弃：任何删减都要留下记录。',
      '不得在转译中强化原意（把「可能」写成「会」）。',
      '目标规范优先于个人偏好。',
    ],
    gates: ['每条结果可回溯', '舍弃项已登记', '术语对照完整'],
  },
  {
    id: 'decide',
    label: '决策',
    verb: '裁定',
    kind: '决策建议',
    steps: [
      '先写决策问题：把要决定的事写成一句可回答的问题，并写清决策的截止条件。',
      '列出选项：给出包含「什么都不做」在内的全部现实选项，不接受二选一预设。',
      '统一评价维度：用同一组维度（收益、代价、风险、可逆性、时效）评价每个选项。',
      '处理不确定性：对每个关键不确定项给出范围而非点估计，并说明它变化到哪一端会改变结论。',
      '给出建议：明确推荐一个选项，写出推荐理由与它成立的前提。',
      '设置观察点：写出执行后要观察的指标、观察窗口与触发改判的阈值。',
    ],
    evidence: ['选项来源', '关键假设及依据', '敏感性的计算方法'],
    outputs: ['决策问题', '选项清单', '维度对比', '不确定性范围', '推荐与前提', '改判阈值'],
    guardrails: [
      '不替决策者承担价值判断：价值取舍要显式交出，不能藏在参数里。',
      '前提消失时结论必须作废，并写明这一点。',
      '禁止用「综合考虑」搪塞，必须列出被综合的项。',
    ],
    gates: ['问题可回答', '含「什么都不做」选项', '改判阈值可观测'],
  },
  {
    id: 'build',
    label: '产出',
    verb: '编制',
    kind: '交付物',
    steps: [
      '先定交付形态：写清最终产物长什么样、由谁使用、放在哪里，避免交付物与用途错位。',
      '先搭骨架：把产物的章节或结构列全并编号，逐节填内容，保证任何时刻都是完整的（可以空但必须有位）。',
      '逐节落实：每一节都要写出具体的 {objects} 处理方式，禁止出现「视情况而定」而不写清取决于什么。',
      '填满可执行细节：涉及数值的地方给出数值与单位，涉及顺序的地方给出顺序与等待条件。',
      '自查与标注：产出后按第七节的 {gates} 自查一遍，把未达到的项显式标出而不是掩盖。',
      '交付说明：写清如何使用、如何更新、哪些部分容易过期。',
    ],
    evidence: ['结构编号清单', '数值与单位', '自查结果'],
    outputs: ['交付形态说明', '完整结构与正文', '可执行细节', '自查结果与未达标项', '维护说明'],
    guardrails: [
      '不允许占位符留在交付物里（如「待补充」），要么写出来，要么显式列为未完成项。',
      '所有数值带单位，所有步骤带顺序。',
      '不写没有操作含义的句子。',
    ],
    gates: ['结构完整无占位符', '数值与单位齐全', '自查结果如实标注'],
  },
]

/** Recipe lookup by id. */
export const RECIPE_BY_ID = new Map(RECIPES.map((recipe) => [recipe.id, recipe]))
