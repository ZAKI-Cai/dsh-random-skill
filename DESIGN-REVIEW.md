# 设计评审：dsh-skillbox

评审对象：`v0.2.2`（8 个领域 / 36 个任务族 / 108 组合，Host 半 ~1900 行，客户端半 1063 行）。
评审视角：把它当成一个要被别人安装、升级、排障、并继续开发的**第三方 DSH 插件**，而不是一段一次性的演示代码。

结论先说：功能层面已经站得住（生成、试用、保留、删除、侧边栏、模型侧工具都能跑通并有测试），但**工程结构上有 6 个明确缺陷**，其中 3 个会在第一次真实升级或排障时立刻咬人。v0.3.0 修掉了这 6 个里的 5 个，剩下的 1 个（i18n）记入路线图。

---

## 一、缺陷清单与定性

| # | 缺陷 | 类型 | 影响 | 严重度 | v0.3.0 |
|---|---|---|---|---|---|
| 1 | Host 与客户端各自硬编码方法名、错误码、前缀，没有单一真相 | 接口契约 | 升级后一侧改了名字，另一侧静默 404/静默降级 | **高** | 已修 |
| 2 | 客户端半 1063 行，非 React 逻辑（API 调用、状态机、错误类）无法单测 | 可测试性 | 任何客户端改动只能靠开浏览器点，回归全靠人眼 | **高** | 已修 |
| 3 | 生成不可复现：`Math.random` 直接使用，无种子 | 可复现性 | 用户看到好 skill 无法再生成一次；排障只能靠复述描述 | **高** | 已修 |
| 4 | 一次生命周期操作对 `.skillbox.json` 写 2–3 次 | 状态一致性 | 崩溃/并发轮询可能读到中间态；写放大 | 中 | 已修 |
| 5 | 工具 schema 与渲染逻辑各写一份字段表 | 契约 | 加字段时容易只加一半，渲染出 `undefined` | 中 | 已修 |
| 6 | 面板没有键盘交互、无 ARIA、无焦点治理 | 可访问性 | 键盘用户无法收起面板；屏幕阅读器读到无标签列表 | 中 | 已修 |
| 7 | 客户端文案硬编码中文，已声明 `dsh-client-locale` 却未使用 | i18n | 非中文用户看到中英混排 | 低 | 路线图 |
| 8 | `workspace-root` 判定散落在入口函数里 | 内聚性 | 改判定规则要动 400 行的入口文件 | 中 | 已修 |
| 9 | HTTP 路由（认证、信封、状态码、SSE）与业务混在入口 | 内聚性 | 无法单独测路由；认证逻辑容易被后续改动绕过 | 中 | 已修 |
| 10 | 错误只传字符串，调用方只能匹配文案 | 可诊断性 | 文案一改，客户端分支失效 | 中 | 已修 |
| 11 | 无 `DESIGN-REVIEW` / 无架构文档，新人只能读代码 | 可维护性 | 每次改动都要重建心智模型 | 低 | 已修 |

---

## 二、逐项分析与处置

### 1. 契约没有单一真相（高）

**问题**：`lib/index.js` 里 `API_PREFIX = '/api/skillbox'`，`lib/client.js` 里再写一遍字符串；方法名在 Host 的 `methods` 对象里、在客户端的 `call("kick")` 调用点里各出现一次；错误码只有 Host 侧有，客户端靠 `String(decoded.error)` 显示。

**后果**：这是最典型的“两侧漂移”。任何一侧增删方法都不会报错——客户端调一个不存在的方法只会拿到 404，用户看到一句无从下手的英文。

**处置**：新增 `lib/contract.js` 作为唯一真相（前缀、`API_VERSION`、方法表含读写标记、错误码表、体积上限、`ContractError`/`okEnvelope`/`errorEnvelope`/`statusOf`）。浏览器半不能 `import` Node 模块，所以 `lib/client-core.js` 里有一份 `CONTRACT` 镜像——**由测试保证镜像不漂移**：`.selftest/contract.mjs` 解析源码、逐项比对、并断言“客户端能调的每个方法 Host 都实现了”。

新增 `info` 方法：客户端挂载时握手，方法集不一致就在面板上直接报出来，而不是等第一次点击失败。每个响应都带 `apiVersion`，不匹配时客户端抛出可读错误。

### 2. 客户端半不可测（高）

**问题**：1063 行里混着 CSS、图标、React 组件、API 调用、状态机。API 调用依赖全局 `fetch`，状态机依赖 `setInterval`，没有注入点，因此 Node 里跑不起来，只能靠浏览器手点。

**处置**：把非 React 部分抽到 `lib/client-core.js`（经典脚本 IIFE，装到 `globalThis.__dshSkillboxCore`），`client.js` 通过 `package.json` 的 `dsh.client.external` 先加载它，只保留 React 组件。核心接受注入的 `fetch` / `now` / `random` / `interval`，于是 `.selftest/client-core.mjs` 可以在 Node 里用假宿主和假时钟断言：

- 调用地址落在契约前缀、`sessionId` 作为 query 传递；
- 失败被包装成带 `code` 的 `HostError`，`display` 给出本地化文案；
- 版本不匹配与契约外方法名都会被拦下；
- 授权窗口状态机：`select → author` 的推进由 `topicMs` 决定，窗口未到不推进，窗口到了推进且只播报一次，窗口内重复生成被忽略；
- `cancelGeneration` 真的删掉了刚写的 skill。

**副作用**：`client.js` 从 1063 行降到 760 行，且“哪些是纯逻辑、哪些是渲染”一眼可分。

### 3. 生成不可复现（高）

**问题**：`generateSkill()` 直接用 `Math.random`。名字里虽然带一个四位随机数，但那只是名字的一部分——它无法还原文档。

**后果**：用户说“刚才那个关于物种鉴定的 skill 不错，再来一份”，做不到；排障时只有一段截屏，无法重建。

**处置**：换成显式种子。`seededRandom(seed)`（mulberry32）+ `newSeed()`，种子随 skill 一起写进 `.skillbox.json` 与文档页脚的知识信息里，并在侧边栏直接显示为 `种子 xxxxxx`。新增 `/api/skillbox/replay`：用记录的种子重放，**逐字节比对磁盘文件**，返回 `reproducible` 与差异清单；侧边栏每张卡片多了「重放校验」按钮。

**一个真实的坑**：重放时若只固定种子，候选池仍会受“当前已有哪些名字”影响，于是同一个种子可能选出不同的配方（我在集成测试里就撞上了：`art-build-playbook-6711` 重放成 `art-analyze-playbook-6711`）。修法是重放时把 `domain + family + recipe` 一起钉住，让种子成为唯一变量；`generateSkill` 因此多了 `recipes` 选项，回归测试固定断言“同种子同主题 ⇒ 同名同正文”“不同种子 ⇒ 不同正文”。

### 4. 元数据写放大与中间态（中）

**问题**：`toggle` 会 `patch()` 一次再 `writeMeta()` 一次；`generate` 会 `patch`（让上一个试用转 kept）+ `add` + `setEnabled` 各写一次元数据。任何一步之间崩掉，或者浏览器 5 秒轮询正好插进来，就会读到“记录说 kept，但文件还在”这类不一致。

**处置**：`Skillbox.mutate(mutator)` 成为唯一的读—改—写入口，`patchMany(changes)` 让“一个 skill 转 kept + 另一个新建”落在同一次原子写里。`writeMeta` 失败被包成 `METADATA_UNREADABLE` 而不是裸 `Error`。写放大从每次操作 2–3 次降到 1 次。

### 5. 工具 schema 与渲染各写一份（中）

**问题**：`tools.js` 里 schema 的 `properties` 与渲染函数读的 `value.xxx` 是两份手工维护的清单。

**处置**：抽到 `lib/tool-contract.js`（`PENDING_OUTPUT_SCHEMA`、`DECIDE_OUTPUT_SCHEMA`、`DECIDE_PARAMETERS`、提示词段落）。`.selftest/contract.mjs` 断言：schema 声明了渲染读到的每个字段，`tools.js` 只读 schema 声明过的字段。这类“加字段只加一半”的 bug 从此在 CI 阶段就挂。

### 6. 可访问性（中）

**问题**：面板无法用键盘收起；列表没有语义；开关只有 `title` 没有 `aria-label`（其实有，但同行被 `button` 覆盖）；进度是纯视觉的；`.dsh-skillbox-list` 没有 `role`；展开后焦点仍停在被移除的节点上。

**处置**：
- `Escape` 收起面板，事件在面板作用域内 `stopPropagation`，不干扰会话输入框；
- 展开/收纳按钮带 `aria-expanded`/`aria-controls`，收起后焦点回到它（用 `data-focus-pending` + `useEffect` 在重渲染后归还）；
- 技能列表 `role="list"` + `aria-label`，每张卡是 `<article>` 且带可读的 `aria-label`（名称 + 状态 + 启用与否）；
- 进度卡与重放结果 `role="status"` + `aria-live="polite"`，`aria-busy` 表白进行中；
- 错误提示 `role="alert"`；
- 面板本身 `role="complementary"` + `aria-label`，并统一 `:focus-visible` 焦点环。

### 8–9. 内聚性：把入口拆成四个协作者（中）

**问题**：`lib/index.js` 曾经 578 行，同时管工作区判定、目录监听、SSE 广播、认证栅栏、HTTP 信封、业务方法、工具注册。改任何一条规则都要在同一个大函数里翻。

**处置**：

| 模块 | 单一职责 |
|---|---|
| `workspace.js` | 工作区根判定、拒绝名单、`diagnose`（端口注入，因此可独立测试） |
| `routes.js` | 认证栅栏、JSON 信封、状态码、SSE、体积上限 |
| `store.js` | 目录与元数据、原子变更 |
| `generator.js` | 种子 → 文档 |
| `index.js` | 只做组合与生命周期 |

`index.js` 现在 406 行，其中大部分是方法表和注释。**认证栅栏也从“写在 handler 内部”变成 `routes.js` 的单一入口**，这正是 v0.2.0 那个“绕过 cookie 认证”缺陷的根因类别——现在它只有一处实现，不可能只修一半。

### 10. 错误可诊断性（中）

**问题**：错误是字符串，客户端只能 `String(error.message)` 显示，也无法据其分支。

**处置**：`ContractError` 带 `code`，`errorEnvelope` 把 `code`、`error`、`details`、`apiVersion` 一起下发；客户端 `HostError` 暴露 `code` 与本地化的 `display`。集成测试断言：畸形 JSON → `bad-json`、跨工作区 → `workspace-refused`、未知 skill 重放 → `unknown-skill`、未知方法 → `unknown-method`（404）。

---

## 三、路线图（v0.3.0 未做，按优先级）

1. **i18n**：已声明 `dsh-client-locale` 却没用。做法：`ctx.locale.register("skillbox", { zh, en })`，组件改用 `t()`；`generator` 的领域/配方文案需要一份英文副本或双语数据（这是真正的成本所在，不适合塞进一次版本）。
2. **客户端组件测试**：把 `SkillCard` / `AuthoringCard` 放到 `@deepseek-ai/dsh-client-test-runtime` 下渲染。核心已可测，组件仍只能靠手点。
3. **目录数据化**：`domains.js` 的 811 行是数据，改成 `catalogue/*.yaml` + 启动时校验，能让非作者贡献任务族；代价是引入解析与 schema 校验。
4. **并发写保护**：`.skillbox.json` 目前只有原子替换，多窗口同时写会互相覆盖。可加锁文件或版本号 + 乐观重试。
5. **服务端限流**：`kick` 目前无节流，快速连点会连写多个 trial（一次只有一个 pending，但磁盘上会留多个）。加一个最小间隔。
6. **面板与右侧栏集成**：现在是 `shell.overlay` 上的固定定位面板，等价于自绘侧边栏。改用 `ctx.sidebarRightTabs` 能获得 DSH 原生的分栏/拖拽/持久化，代价是必须处理无会话时不可用的限制。

---

## 四、v0.3.0 的验证强度

| 套件 | 覆盖 |
|---|---|
| `.selftest/contract.mjs` | 前缀/版本/方法表/错误码镜像、Host 实现完整性、面板动作在核心中存在、工具 schema 与渲染一致 |
| `.selftest/client-core.mjs` | 浏览器核心：调用契约、错误包装与本地化、版本不匹配、契约外方法、授权窗口状态机、取消失效、镜像不漂移 |
| `.selftest/harness.mjs` | 真实 HTTP 服务器：认证栅栏、404/405/413/400、信封与错误码、目录接口、收窄选题、种子重放逐字节一致、跨工作区拒绝、完整生命周期 |
| `.selftest/root-resolution.mjs` | 工作区根判定（含拒绝名单）、400 次抽取全覆盖且结构达标、重放确定性、`ContractError` 语义 |

四个套件全部在 Node 里跑，不需要浏览器、不需要运行中的 DSH——这是把缺陷 2 修掉之后才可能有的东西。
