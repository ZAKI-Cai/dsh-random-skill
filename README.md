# dsh-skillbox

`v0.2.1`

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）插件：**随机生成 skill，试用它，再决定它的去留**，并用屏幕右侧一个可展开／可缩略的侧边栏管理 skillbox。

```text
点「生成随机 Skill」
      → 生成一个完全随机的 skill，输出简短介绍
      → 「试用」 / 「忽略」
            忽略 → 删除这个 skill 的文件
            试用 → 暂存到工作区（写进 .dsh/skills），下一次对话模型即可调用
                   → 试用结束后给出「保留到 skill 包」 / 「删除该 skill」
                        保留到 skill 包 → 永久保存在工作区的 skillbox/ 文件夹中
                        删除该 skill   → 删除该 skill 的文件
```

安装本插件时会自动在工作区创建 `skillbox/` 文件夹。

---

## 功能

### 1. 生成 + 试用生命周期

| 步骤 | 触发位置 | 行为 |
|---|---|---|
| 生成随机 skill | 左侧边栏底部的 ✦ 按钮，或右侧 skillbox 侧边栏顶部的「生成随机 Skill」 | 组合一个随机的名字、简介与完整说明，写入 `skillbox/<name>/SKILL.md`，并输出简短介绍 |
| **试用** | 生成卡片上的「试用」按钮 | skill 保留在 skillbox，并复制一份到 `<工作区>/.dsh/skills/<name>/SKILL.md` —— 这是 DSH 的项目 skill 根目录，所以**下一次对话**模型就能看到并按需调用它 |
| **忽略** | 生成卡片上的「忽略」按钮 | 立刻删除该 skill 的文件（skillbox 与 `.dsh/skills` 两处） |
| **保留到 skill 包** | 生成卡片／侧边栏卡片上的同名按钮，或模型调用 `skillbox_decide` | 状态变为「已保留」，永久保存在工作区 `skillbox/` 中，保持启用 |
| **删除该 skill** | 生成卡片／侧边栏卡片上的同名按钮，或模型调用 `skillbox_decide` | 删除 `skillbox/<name>/` 与 `.dsh/skills/<name>/` |

生成的 skill 是**真的能用**的：正文包含 frontmatter（`name` / `description` / `whenToUse` / `user-invocable`）加「工作方式 / 步骤 / 产出 / 约束」四段，由 8 类原型（审查、重构、文档、测试、诊断、规划、整理、发布）× 随机名词 × 随机步骤组合而成。

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
  - 待决定的 skill、以及每个 skill 一行：名称、状态徽标（试用中 / 已保留 / 已禁用）、**启用开关**、简介、「删除」按钮；
  - skillbox 的绝对路径；
  - **底端的「生成随机 Skill」按钮** —— 面板最下方那条常驻操作，按下即生成一个随机 skill 并弹出「试用 / 忽略」卡片。

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
| `POST` | `/api/skillbox/kick` | 生成一个随机 skill |
| `POST` | `/api/skillbox/pending` | 当前待试用的 skill（含完整正文） |
| `POST` | `/api/skillbox/toggle` | `{ name, enabled }` 启用／禁用 |
| `POST` | `/api/skillbox/decide` | `{ name, decision: "keep" \| "delete" \| "disable" }` |
| `POST` | `/api/skillbox/remove` | `{ name }` 删除 |
| `POST` | `/api/skillbox/state` | `{ name, state }` 只改状态 |
| `POST` | `/api/skillbox/refresh` | 重新读盘（会收编手动放进 skillbox 的文件夹） |
| `GET` | `/api/skillbox/events` | SSE 变更推送 |

所有写操作都会先校验请求里的工作区根路径是否等于当前工作区，跨工作区的写入会被拒绝。

---

## 工作原理

- **Host 半**（`lib/index.js`、`lib/store.js`、`lib/generator.js`、`lib/tools.js`）：skillbox 的唯一写入者。它负责生成 skill、维护 `.skillbox.json`、复制／删除启用副本、注册 `skillbox_pending` / `skillbox_decide` 两个工具，并提供上面那张 HTTP 表。工作区根路径优先取当前会话的 `header.cwd`，浏览器请求没有会话时退回沙箱策略的 `workspace-write` 根。
- **Client 半**（`lib/client.js`）：一个手写的 DSH 客户端 bundle（`window.__ModuleLoader__.load`，无构建步骤）。它注册三个壳座位：`shell.overlay`（右侧侧边栏）、`sidebar.footer.action`（生成按钮）、`conversation.input.dock`（试用卡片），通过上面那张 HTTP 表与 Host 通信。
- **启用即副本**：模型能不能看到某个 skill，只取决于 `.dsh/skills/<name>/SKILL.md` 是否存在。这让「启用开关」拥有一份唯一真相，也让 DSH 自带的文件监听负责推送目录变更。

## 开发

```bash
# 集成自测：桩上下文 + 真实 HTTP 服务器，跑完整请求路径
# （路由、认证栅栏、JSON 信封、参数解析、生成 → 试用 → 保留 → 删除）
node .selftest/harness.mjs

# 工作区根路径判定的回归测试
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

- 客户端半是手写的 bundle，不经过打包器；它只依赖模块表里的 `react`。
- 侧边栏是 `shell.overlay` 上的固定定位面板，不参与右侧栏的分栏／拖拽布局。
- 一次只有一个「待决定」的 skill：再次生成时，上一个未决定的试用会被视为已保留（文件不动）。
- 生成器产出的是中文 skill；它不会调用模型，纯本地组合。
- DSH 的 HMR 不监视工作区，插件代码改动需要重启 DSH 生效。

## 变更记录

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
