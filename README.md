# dsh-skillbox

`v0.2.2`

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）插件：**随机生成 skill，试用它，再决定它的去留**，并用屏幕右侧一个可展开／可缩略的侧边栏管理 skillbox。

```text
点「生成随机 Skill」
      → 0–10s：在 36 个任务族里随机选题（界面显示「正在选取 skill 主题…」）
      → 1–7min：编写 skill 文档（界面显示「已选中主题，正在编写…」+ 主题标签 + 字数与结构校验）
      → 「试用」 / 「忽略」
            忽略 → 删除这个 skill 的文件
            试用 → 暂存到工作区（写进 .dsh/skills），下一次对话模型即可调用
                   → 试用结束后给出「保留到 skill 包」 / 「删除该 skill」
                        保留到 skill 包 → 永久保存在工作区的 skillbox/ 文件夹中
                        删除该 skill   → 删除该 skill 的文件
```

安装本插件时会自动在工作区创建 `skillbox/` 文件夹。

---

## 生成范围

生成器的随机性由三层叠加而成：**领域 × 任务族 × 方案配方**，再叠加每次抽取的具体细分（子领域、读者、交付物、参数、术语子集、工作风格）。

| 领域 | 任务族 | 细分示例 |
|---|---|---|
| **生物类** | 物种鉴定、分子生物学实验设计、临床推理、生态野外调查、系统发育与进化推断、实验室方法与安全、标本与数据管理 | 昆虫/鸟类/维管植物/真菌…；PCR、CRISPR、Western blot…；急诊分诊、慢病随访… |
| **写作类** | 学术写作、即兴创作与虚构、技术写作、编辑与结构、修辞与说服、叙事结构设计 | 期刊论文/学位论文/基金申请；即兴短篇/对白场景；API 文档/部署手册… |
| **地理类** | 自然地理分析、人文地理与区域分析、地图与空间数据、区域研究、灾害与风险 | 流域地貌、气候区划、土壤剖面…；人口迁移、产业区位…；专题制图、投影选择… |
| **算法类** | 复杂度分析与算法选择、数据结构设计、图与优化算法、算法正确性验证、并发与分布式 | 摊还分析、缓存友好性；索引结构、并发容器；网络流、调度排程；随机对拍、模糊测试；幂等重试、消息顺序… |
| **绘画类**（仅知识） | 艺术史脉络、色彩与构图、技法与材料知识、视觉批评、观察与写生 | 文艺复兴/巴洛克/东亚绘画；同时对比、明度结构；油画与丙烯、水彩、版画；作品评述、展览评论… |
| **数据与统计** | 因果推断、数据质量、实验与抽样设计 | 工具变量、断点回归、双重差分；缺失机制、口径漂移；A/B 实验、功效分析… |
| **语言与语言学** | 术语标准化、翻译质量评估、语料与标注 | 双语术语表、行业术语；字幕/法律文本翻译；实体标注、标注一致性… |
| **音乐类** | 和声与曲式分析、练习方法设计 | 功能和声、对位、配器；慢速拆解、视奏训练… |

当前目录：**8 个领域 / 36 个任务族 / 108 种（任务族 × 配方）组合**，再乘以每个任务族内部的细分数，实际可生成的 skill 空间是数万级。侧边栏底部会显示当前覆盖量，`/api/skillbox/catalogue` 可读到完整清单。

## 生成的 skill 长什么样

每篇文档都必须通过一份**结构校验**（`lib/generator.js` 的 `validateSkill`，共 12 项），不达标会在界面上标出「结构校验未过」。固定骨架：

| 章节 | 作用 |
|---|---|
| `适用与不适用` | 什么任务该用、什么任务不该用、本次工作风格 |
| `一、先读这一条` | 这个 skill 唯一不能搞砸的事 |
| `二、何时触发` | 触发条件（任务类型、用户措辞、要处理的对象、必须严格区分的术语） |
| `三、动手之前` | 前置确认四项：对象是否齐全、口径是否一致、读者是谁、边界在哪 |
| `四、执行步骤` | 6 条有序步骤，来自配方并按领域替换占位符 |
| `五、硬约束` | 领域规则（如「学名首次出现必须给完整双名法+命名人+年份」） |
| `六、产出必须包含` | 交付字段清单 + 面向谁表述 |
| `七、质量闸门` | 表格：检查项 → 不通过时怎么办 |
| `八、术语与常见错误` | 术语表（强制统一用法）+ 该领域最常见的错误 |
| `九、失败处理与升级` | 证据不足、口径冲突、对象缺失、结果异常、超出范围各自的处置 |
| `十、依据与延伸` | 必需证据类型 |

正文长度 2.4–2.9 KB，且校验会拦住任何未填充的模板占位符（0.2.2 前有 1/3 的抽取会带上 `{qualityGates}` 这类残留，现已修掉）。

## 功能

### 1. 生成 + 试用生命周期

| 步骤 | 触发位置 | 行为 |
|---|---|---|
| 生成随机 skill | 左侧边栏底部的 ✦ 按钮，或右侧 skillbox 侧边栏**底端**的「生成随机 Skill」 | 选题（界面用 5–10s 窗口呈现）→ 编写文档（界面用 1–7min 窗口呈现）→ 写入 `skillbox/<name>/SKILL.md` 并输出简短介绍 |
| **试用** | 生成卡片上的「试用」按钮 | skill 保留在 skillbox，并复制一份到 `<工作区>/.dsh/skills/<name>/SKILL.md` —— 这是 DSH 的项目 skill 根目录，所以**下一次对话**模型就能看到并按需调用它 |
| **忽略** | 生成卡片上的「忽略」按钮 | 立刻删除该 skill 的文件（skillbox 与 `.dsh/skills` 两处） |
| **保留到 skill 包** | 生成卡片／侧边栏卡片上的同名按钮，或模型调用 `skillbox_decide` | 状态变为「已保留」，永久保存在工作区 `skillbox/` 中，保持启用 |
| **删除该 skill** | 生成卡片／侧边栏卡片上的同名按钮，或模型调用 `skillbox_decide` | 删除 `skillbox/<name>/` 与 `.dsh/skills/<name>/` |

> **关于两个时间窗**：文档是本地即时合成的（毫秒级），但你要求的「5–10 秒选题、1–7 分钟编写」被如实做成**进度契约**——界面按这两个窗口呈现，`kick` 返回的 `window` 字段把窗口值交给客户端，模型侧工具也会看到同样的窗口，所以「试用」之后模型知道它可以花 1–7 分钟真正把这份 skill 用起来。校验结果（字数、结构是否达标）在同一张卡片上直接可见，不需要假装等待。

### 2. 模型侧的两个工具

| 工具 | 作用 |
|---|---|
| `skillbox_pending` | 读取当前待试用的 skill：返回它的完整说明，并要求模型在本次对话中用它完成一次真实任务 |
| `skillbox_decide` | 试用结束后调用，把「保留到 skill 包 / 删除该 skill」交回用户决定（模型不替用户决定） |

插件还会往系统提示里加一小段说明，告诉模型这两个工具的存在与用法。

### 3. 右侧可展开／缩略的 skillbox 侧边栏

固定在窗口**右侧边缘**，不占用会话栏宽度、盖在整个应用之上：

- **缩略态**：一条 44px 的竖条 —— skillbox 数量与待决定数量，加一个展开入口。
- **展开态**：336px 面板，自上而下是
  - 标题栏「Skillbox」+ 重新读盘按钮；
  - **生成进度卡**（生成期间）：阶段提示、主题标签（领域 / 任务族 / 配方 / 风格 / 代号）、已用秒数、文档字数与结构校验结果，以及「取消并删除」；
  - 待决定的 skill 卡片：名称、领域/任务族/配方/风格标签、简介、字数与校验结论，以及**「试用」「忽略」「查看说明」**三个按钮；
  - 每个 skill 一行：名称、状态徽标（试用中 / 已保留 / 已禁用）、**启用开关**、简介、「删除」按钮；
  - skillbox 的绝对路径 + 当前生成覆盖量（`8 域 / 36 族 / 108 组合`）；
  - **底端的「生成随机 Skill」按钮** —— 面板最下方那条常驻操作，按下即生成并弹出「试用 / 忽略」卡片。

**展开／收纳按钮（v0.2 新增）**：贴在侧边栏**左侧边缘、垂直居中**，是一枚半圆形的把手。

| 状态 | 箭头方向 | 按下后 |
|---|---|---|
| 已收纳 | ←（指向左） | 展开侧边栏 |
| 已展开 | →（指向右） | 收纳侧边栏 |

它同时挂在缩略态与展开态的轨道上，所以无论收展都能顺手切换；标题栏右侧也有一个等价的关闭按钮。

**启用开关的含义**：开启会把该 skill 复制到 `<工作区>/.dsh/skills/`，模型在下一次对话就能看到它；关闭会移除那份副本，模型就看不到它 —— 这正是「在侧边栏控制 skillbox 中 skill 的启用情况」。

---

## 安装

### 从 GitHub 安装

```bash
dsh plugin --profile desktop add github:<owner>/dsh-skillbox
```

### 从本地目录安装（开发用）

```bash
dsh plugin --profile desktop add link:/absolute/path/to/dsh-skillbox
```

安装后重启 DSH（或让已运行的实例重新协调 profile patch），插件即可生效。

> 手动方式：在 profile 的 `cordis.patch.yml` 里加一行，并把包加进 profile 的 `package.json`：
>
> ```yaml
> - insert:
>     - id: dsh-skillbox
>       name: "dsh-skillbox"
> ```

---

## 文件布局

安装后，工作区里会出现：

```text
<工作区>/
├── skillbox/                         ← 本插件的 skill 仓库
│   ├── .skillbox.json                ← 插件自己维护的元数据（状态、创建时间、待决定项）
│   └── <skill-name>/
│       └── SKILL.md                  ← skill 本体（frontmatter + 说明）
└── .dsh/
    └── skills/
        └── <skill-name>/SKILL.md     ← 「已启用」时才存在的副本，模型通过它看到 skill
```

`skillbox/` 是永久仓库，`.dsh/skills/` 是启用副本 —— 后者由 DSH 的 `dsh-skill-filesystem` 提供者扫描并监听，所以任何增删都会自动刷新会话的 skill 目录，不需要重启。

## 配置

本插件没有必填配置。

## HTTP 接口（浏览器半使用）

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/skillbox/list` | 读取 skillbox 与待决定项 |
| `POST` | `/api/skillbox/kick` | 生成一个随机 skill；可传 `{ topic: { domainId, familyId } }` 收窄选题 |
| `POST` | `/api/skillbox/catalogue` | 生成目录：领域、任务族、配方、组合数、两个时间窗、文档最小字数 |
| `POST` | `/api/skillbox/pending` | 当前待试用的 skill（含完整正文与领域元数据） |
| `POST` | `/api/skillbox/toggle` | `{ name, enabled }` 启用／禁用 |
| `POST` | `/api/skillbox/decide` | `{ name, decision: "keep" \| "delete" \| "disable" }` |
| `POST` | `/api/skillbox/remove` | `{ name }` 删除 |
| `POST` | `/api/skillbox/state` | `{ name, state }` 只改状态 |
| `POST` | `/api/skillbox/refresh` | 重新读盘（会收编手动放进 skillbox 的文件夹） |
| `POST` | `/api/skillbox/diagnose` | 工作区根路径的判定过程（候选值 + 最终选择 + 被否决值） |
| `GET` | `/api/skillbox/events` | SSE 变更推送 |

`kick` 的响应里带 `window`（`selectMinMs/selectMaxMs/authorMinMs/authorMaxMs`）与 `composition.composeMs`，客户端据此呈现两个阶段。所有写操作都会先校验请求里的工作区根路径是否等于当前工作区，跨工作区与指向 `DSH_PROFILE_DIR`/`DSH_HOME` 的写入都会被拒绝。

---

## 工作原理

- **Host 半**（`lib/index.js`、`lib/store.js`、`lib/domains.js`、`lib/recipes.js`、`lib/generator.js`、`lib/tools.js`）：skillbox 的唯一写入者。它负责生成 skill、维护 `.skillbox.json`、复制／删除启用副本、注册 `skillbox_pending` / `skillbox_decide` 两个工具，并提供上面那张 HTTP 表。
  - `domains.js` 是**领域知识**：8 个领域、36 个任务族，每族带自己的对象、术语、硬规则、证据类型、失败模式与完成闸门。
  - `recipes.js` 是**配方骨架**：7 种工作类型（分析／方案设计／核查／教学／转译／决策／产出），各带 6 步流程、证据标准、产出契约与过程约束。
  - `generator.js` 把两者与一次随机抽取交叉组合，渲染成完整文档并做 12 项结构校验。
- **Client 半**（`lib/client.js`）：一个手写的 DSH 客户端 bundle（`window.__ModuleLoader__.load`，无构建步骤）。它注册三个壳座位：`shell.overlay`（右侧侧边栏）、`sidebar.footer.action`（生成按钮）、`conversation.input.dock`（试用/进度卡片），通过上面那张 HTTP 表与 Host 通信。
- **启用即副本**：模型能不能看到某个 skill，只取决于 `.dsh/skills/<name>/SKILL.md` 是否存在。这让「启用开关」拥有一份唯一真相，也让 DSH 自带的文件监听负责推送目录变更。

## 开发

```bash
# 集成自测：桩上下文 + 真实 HTTP 服务器，跑完整请求路径
# （路由、认证栅栏、JSON 信封、参数解析、生成 → 试用 → 保留 → 删除）
node .selftest/harness.mjs

# 工作区根路径判定 + 生成器契约的回归测试
# （策略根=profile 时必须选中 Session 工作区；400 次抽取全部结构达标且覆盖所有领域）
node .selftest/root-resolution.mjs

# 语法检查
node --check lib/index.js && node --check lib/client.js
```

> **注意**：DSH 的 HMR 只监视应用自身目录，不监视工作区里的插件源码。改完插件代码必须**重启 DSH** 才会生效。
> 用 `.selftest/harness.mjs` 可以在不重启的情况下验证 Host 半的全部逻辑。

### 命令行探测正在运行的实例

```powershell
# 用 browser-session 凭据生成 cookie 后调用任意方法
powershell -NoProfile -ExecutionPolicy Bypass -File .selftest/probe.ps1 -Method list
powershell -NoProfile -ExecutionPolicy Bypass -File .selftest/probe.ps1 -Method diagnose
```

## 工作区根路径是怎么定的

skillbox 必须落在**用户的工作区**，而不是 DSH 的配置目录。判定顺序（`lib/index.js` 的 `workspaceRootOf`）：

1. 当前请求或工具调用所属 Session 的 `header.cwd`；
2. 本进程上一次观察到的 Session 工作区（浏览器请求本身不带 Session，靠它兜住）；
3. 现存 Session 中创建时间最新的那个的 `cwd`；
4. 沙箱策略的 `workspaceRoot` —— **但如果是 `DSH_PROFILE_DIR` / `DSH_HOME` 就直接否决**；
5. 最后才退回 `process.cwd()`。

`/api/skillbox/diagnose` 会把这几个候选值与最终选择一起返回，便于排查。

## 已知限制

- **文档是本地合成、不是模型撰写**：生成器不调用模型，所以选题与文档质量由 `domains.js` / `recipes.js` 的知识量决定，而不是模型的即时创作。想更深，就往这两个文件里加任务族或配方。
- 客户端半是手写的 bundle，不经过打包器；它只依赖模块表里的 `react`。
- 侧边栏是 `shell.overlay` 上的固定定位面板，不参与右侧栏的分栏／拖拽布局。
- 一次只有一个「待决定」的 skill：再次生成时，上一个未决定的试用会被视为已保留（文件不动）。
- 领域细分会持续偏向「每族 5–8 个子领域」，不保证无限细分；抽取空间靠族数 × 子领域数增长。
- DSH 的 HMR 不监视工作区，插件代码改动需要重启 DSH 生效。

## 变更记录

### v0.2.2

- **生成范围扩展**：从单一原型池改为「领域 × 任务族 × 配方」三层叠加。新增 `lib/domains.js`（8 个领域 / 36 个任务族：生物、写作、地理、算法、绘画（仅知识）、数据与统计、语言与语言学、音乐）与 `lib/recipes.js`（7 种配方骨架），`lib/generator.js` 重写为交叉组合 + 逐篇结构校验。可生成空间从数十种升到数万级。
- **文档明确性**：每篇固定 11 个章节（适用/不适用、先读这一条、何时触发、动手之前、执行步骤、硬约束、产出必须包含、质量闸门表、术语与常见错误、失败处理与升级、依据与延伸），并强制通过 12 项结构校验（含「不得残留未填充的模板占位符」——此项在 0.2.2 前会让约 1/3 的抽取不达标）。
- **两段式进度**：`kick` 返回 `window` 与 `composition.composeMs`；客户端呈现「正在选取 skill 主题…（5–10s 窗口）」与「已选中主题，正在编写 skill 文档…（1–7min 窗口）」，后者显示主题标签、已用秒数、文档字数与结构校验结论，并提供「取消并删除」。
- **新增** `/api/skillbox/catalogue`（领域/任务族/配方/组合数/时间窗），侧边栏底部显示当前覆盖量。
- `skillbox_pending` 现在额外返回领域、任务族、配方与字数，模型的上下文里能直接看到这条 skill 出自哪个学科。
- 集成测试补上目录接口、收窄选题、元数据持久化与进度窗口的断言。

### v0.2.1

- **修复**：skillbox 曾被建到 DSH profile 目录（`~/.dsh/profiles/<profile>/skillbox`），因为插件直接采信了沙箱策略的 `workspaceRoot`。现在优先用真实 Session 的 `cwd`，并把 profile/home 目录列入黑名单；新增 `/api/skillbox/diagnose` 输出判定过程。
- `.selftest/harness.mjs` 升级为**真实 HTTP 服务器集成测试**（覆盖认证栅栏、未知方法、跨工作区拒绝、完整生命周期）。
- 新增 `.selftest/root-resolution.mjs` 回归测试，钉住「策略根 = profile 时必须选中 Session 工作区」这一行为。

### v0.2.0

- 右侧侧边栏**底端**新增常驻的「生成随机 Skill」按钮：面板打开时随手就能生成，不必再去左侧栏找入口。
- 侧边栏**左侧边缘、垂直居中**新增展开／收纳把手：收纳时箭头指向左（按下展开），展开时箭头指向右（按下收纳）；缩略态与展开态都能用。
- 缩略态轨道加宽到 44px，容纳这枚把手。
- `/api/skillbox` 路由补齐 `ctx.connection.admit(req)` 认证栅栏（此前会绕过 `/api` 的 cookie 与 Host/Origin 校验）。

### v0.1.0

- 首个版本：随机 skill 生成、试用／忽略、保留到 skill 包／删除、右侧 skillbox 侧边栏与启用开关、`skillbox_pending` 与 `skillbox_decide` 两个模型侧工具。

## License

MIT
