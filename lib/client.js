window.__ModuleLoader__.load({
	id: "dsh-skillbox",
	factory: (require) => {
		var module = { exports: {} }
		var exports = module.exports
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })
		const React = require("react")

		//#region skillbox: client/<style>
		const CSS = [
			".dsh-skillbox-root{position:fixed;top:0;right:0;height:100vh;z-index:60;display:flex;pointer-events:auto;font-family:inherit}",
			".dsh-skillbox-rail{width:36px;flex:none;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0;background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-1));border-left:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}",
			".dsh-skillbox-panel{width:336px;flex:none;display:flex;flex-direction:column;background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-1));border-left:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);box-shadow:-8px 0 24px rgba(0,0,0,.08)}",
			".dsh-skillbox-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:.5px solid var(--dsw-alias-border-l1)}",
			".dsh-skillbox-title{font-size:13px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsh-skillbox-iconbtn{width:26px;height:26px;flex:none;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}",
			".dsh-skillbox-iconbtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}",
			".dsh-skillbox-iconbtn[disabled]{opacity:.45;cursor:default}",
			".dsh-skillbox-body{flex:1;min-height:0;overflow-y:auto;padding:8px 10px 14px;display:flex;flex-direction:column;gap:8px}",
			".dsh-skillbox-primary{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:var(--dsw-alias-brand-primary);color:#fff;font-size:13px;font-weight:600;cursor:pointer}",
			".dsh-skillbox-primary[disabled]{opacity:.55;cursor:default}",
			".dsh-skillbox-note{font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary)}",
			".dsh-skillbox-error{font-size:12px;line-height:1.55;color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;word-break:break-word}",
			".dsh-skillbox-empty{padding:18px 6px;text-align:center;font-size:12px;color:var(--dsw-alias-label-secondary)}",
			".dsh-skillbox-card{border:.5px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;background:var(--dsw-alias-bg-layer-1)}",
			".dsh-skillbox-card-head{display:flex;align-items:center;gap:8px}",
			".dsh-skillbox-name{flex:1;min-width:0;font-size:13px;font-weight:600;word-break:break-all}",
			".dsh-skillbox-desc{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary);word-break:break-word}",
			".dsh-skillbox-actions{display:flex;flex-wrap:wrap;gap:6px}",
			".dsh-skillbox-btn{border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12px;padding:5px 10px;cursor:pointer}",
			".dsh-skillbox-btn:hover{border-color:var(--dsw-alias-brand-primary)}",
			".dsh-skillbox-btn[disabled]{opacity:.5;cursor:default}",
			".dsh-skillbox-btn-danger{color:var(--dsw-alias-state-error-primary)}",
			".dsh-skillbox-btn-danger:hover{border-color:var(--dsw-alias-state-error-primary)}",
			".dsh-skillbox-badge{display:inline-flex;align-items:center;height:18px;padding:0 7px;border-radius:9px;font-size:11px;line-height:1;flex:none;border:.5px solid transparent}",
			".dsh-skillbox-badge-trial{background:var(--dsw-alias-state-warn-primary);color:#1b1b1b}",
			".dsh-skillbox-badge-kept{background:var(--dsw-alias-state-success-primary);color:#1b1b1b}",
			".dsh-skillbox-badge-off{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}",
			".dsh-skillbox-switch{position:relative;width:32px;height:18px;flex:none;border-radius:9px;background:var(--dsw-alias-state-idle-primary);border:0;cursor:pointer;padding:0}",
			".dsh-skillbox-switch[data-on='true']{background:var(--dsw-alias-brand-primary)}",
			".dsh-skillbox-switch::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .12s}",
			".dsh-skillbox-switch[data-on='true']::after{transform:translateX(14px)}",
			".dsh-skillbox-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 4px;border-radius:9px;font-size:11px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}",
			".dsh-skillbox-offer{border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px;margin:0 0 6px;display:flex;flex-direction:column;gap:8px;background:var(--dsw-alias-bg-layer-1)}",
			".dsh-skillbox-offer-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}",
			".dsh-skillbox-pre{margin:0;max-height:170px;overflow:auto;padding:8px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-size:11.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word;font-family:var(--dsh-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)}",
			".dsh-skillbox-foot{display:flex;align-items:center;gap:8px;padding:8px 12px;border-top:.5px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-secondary)}",
			".dsh-skillbox-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left}",
		].join("")
		const tagId = "dsh-skillbox/skillbox.css"
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style")
			tag.dataset.plugin = "dsh-skillbox"
			tag.dataset.pluginCss = tagId
			tag.textContent = CSS
			document.head.appendChild(tag)
		}
		//#endregion

		//#region skillbox: client/<api>
		/** The HTTP face the host half serves. */
		const API = "/api/skillbox"
		/** Session the panel is currently reading for, when a Session is on screen. */
		let boundSessionId = null

		/**
		 * Call one host method.
		 * @param method - host method name.
		 * @param payload - JSON body.
		 * @returns the decoded response, or `null` when the host face is unreachable.
		 */
		async function call(method, payload) {
			const query = boundSessionId === null ? "" : `?sessionId=${encodeURIComponent(boundSessionId)}`
			const response = await fetch(`${API}/${method}${query}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload ?? {}),
			})
			const decoded = await response.json().catch(() => null)
			if (decoded === null) throw new Error(`skillbox: ${method} 返回了无法解析的响应`)
			if (decoded.ok !== true) throw new Error(String(decoded.error ?? `${method} 失败`))
			return decoded
		}

		/** Shared skillbox state: one store, every entry reads the same snapshot. */
		const store = (() => {
			let state = {
				ready: false,
				busy: false,
				error: null,
				root: "",
				skillboxDir: "",
				enabledDir: "",
				skills: [],
				pending: null,
				offer: null,
				lastGenerated: null,
			}
			const listeners = new Set()
			const emit = () => {
				for (const listener of [...listeners]) {
					try {
						listener()
					} catch (error) {
						console.error("[skillbox] listener failed:", error)
					}
				}
			}
			return {
				get: () => state,
				set: (patch) => {
					state = { ...state, ...patch }
					emit()
				},
				subscribe: (listener) => {
					listeners.add(listener)
					return () => listeners.delete(listener)
				},
				/** Read the skillbox from the host. */
				async load(options) {
					try {
						const result = await call("pending", {})
						const view = await call("list", { root: options?.root })
						store.set({
							ready: true,
							error: null,
							root: view.root,
							skillboxDir: view.skillboxDir,
							enabledDir: view.enabledDir,
							skills: view.skills ?? [],
							pending: view.pending ?? null,
							offer: result.offer ?? null,
						})
					} catch (error) {
						store.set({ ready: true, error: String(error?.message ?? error) })
					}
				},
				/** Generate one random skill. */
				async generate() {
					store.set({ busy: true, error: null })
					try {
						const result = await call("kick", {})
						store.set({
							busy: false,
							error: null,
							root: result.view.root,
							skillboxDir: result.view.skillboxDir,
							enabledDir: result.view.enabledDir,
							skills: result.view.skills ?? [],
							pending: result.view.pending ?? null,
							offer: { ...result.skill, state: "trial" },
							lastGenerated: result.skill,
						})
						return result.skill
					} catch (error) {
						store.set({ busy: false, error: String(error?.message ?? error) })
						return null
					}
				},
				/** Discard the freshly generated skill. */
				async ignore(name) {
					store.set({ busy: true, error: null })
					try {
						const result = await call("remove", { name })
						store.set({
							busy: false,
							skills: result.view.skills ?? [],
							pending: result.view.pending ?? null,
							offer: null,
						})
					} catch (error) {
						store.set({ busy: false, error: String(error?.message ?? error) })
					}
				},
				/** Keep the skill in the skillbox (the trial result is accepted). */
				async decide(name, decision) {
					store.set({ busy: true, error: null })
					try {
						const result = await call("decide", { name, decision })
						store.set({
							busy: false,
							skills: result.view.skills ?? [],
							pending: result.view.pending ?? null,
							offer: null,
							lastGenerated: null,
						})
					} catch (error) {
						store.set({ busy: false, error: String(error?.message ?? error) })
					}
				},
				/** Enable or disable one skill in the workspace catalog. */
				async toggle(name, enabled) {
					store.set({ busy: true, error: null })
					try {
						const result = await call("toggle", { name, enabled })
						store.set({ busy: false, skills: result.view.skills ?? [], pending: result.view.pending ?? null })
					} catch (error) {
						store.set({ busy: false, error: String(error?.message ?? error) })
					}
				},
				/** Delete one skill's folder and its enabled copy. */
				async remove(name) {
					store.set({ busy: true, error: null })
					try {
						const result = await call("remove", { name })
						store.set({ busy: false, skills: result.view.skills ?? [], pending: result.view.pending ?? null })
					} catch (error) {
						store.set({ busy: false, error: String(error?.message ?? error) })
					}
				},
			}
		})()

		/** Subscribe a component to the shared store. */
		function useStore() {
			const [, force] = React.useState(0)
			React.useEffect(() => store.subscribe(() => force((value) => value + 1)), [])
			return store.get()
		}
		//#endregion

		//#region skillbox: client/<icons>
		function icon(paths, size) {
			return React.createElement(
				"svg",
				{ width: size ?? 15, height: size ?? 15, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
				...paths.map((d, index) =>
					React.createElement("path", {
						key: index,
						d,
						stroke: "currentColor",
						strokeWidth: 1.3,
						strokeLinecap: "round",
						strokeLinejoin: "round",
					}),
				),
			)
		}
		const IconSpark = (props) => icon(["M8 2.2v2.4", "M8 11.4v2.4", "M2.2 8h2.4", "M11.4 8h2.4", "M4.4 4.4l1.7 1.7", "M9.9 9.9l1.7 1.7", "M11.6 4.4l-1.7 1.7", "M6.1 9.9l-1.7 1.7"], props?.size)
		const IconBox = (props) => icon(["M8 1.8 14 5v6l-6 3.2L2 11V5z", "M2 5l6 3.2L14 5", "M8 8.2v6"], props?.size)
		const IconClose = (props) => icon(["M4 4l8 8", "M12 4l-8 8"], props?.size)
		const IconTrash = (props) => icon(["M3 4.5h10", "M6.5 4.5V3h3v1.5", "M5 4.5l.6 8.2h4.8l.6-8.2"], props?.size)
		const IconRefresh = (props) => icon(["M13 8a5 5 0 1 1-1.6-3.7", "M13 2.5V5h-2.5"], props?.size)
		//#endregion

		//#region skillbox: client/<atoms>
		const STATE_LABEL = { trial: "试用中", kept: "已保留", disabled: "已禁用" }
		const STATE_CLASS = {
			trial: "dsh-skillbox-badge dsh-skillbox-badge-trial",
			kept: "dsh-skillbox-badge dsh-skillbox-badge-kept",
			disabled: "dsh-skillbox-badge dsh-skillbox-badge-off",
		}

		/** One skillbox row: state, enable switch, delete. */
		function SkillCard({ skill, busy }) {
			const state = skill.state ?? "kept"
			const missing = skill.missing === true
			return React.createElement(
				"div",
				{ className: "dsh-skillbox-card", "data-skill": skill.name },
				React.createElement(
					"div",
					{ className: "dsh-skillbox-card-head" },
					React.createElement("span", { className: "dsh-skillbox-name", title: skill.name }, skill.name),
					React.createElement("span", { className: STATE_CLASS[state] ?? STATE_CLASS.disabled }, STATE_LABEL[state] ?? state),
					missing
						? null
						: React.createElement("button", {
								type: "button",
								className: "dsh-skillbox-switch",
								"data-on": skill.enabled === true ? "true" : "false",
								role: "switch",
								"aria-checked": skill.enabled === true,
								"aria-label": `${skill.enabled === true ? "禁用" : "启用"} ${skill.name}`,
								title: skill.enabled === true ? "已启用：模型可以看到并使用它" : "已禁用：模型看不到它",
								disabled: busy,
								onClick: () => void store.toggle(skill.name, skill.enabled !== true),
							}),
				),
				skill.description === "" || skill.description === undefined
					? null
					: React.createElement("div", { className: "dsh-skillbox-desc" }, skill.description),
				missing
					? React.createElement("div", { className: "dsh-skillbox-note" }, "磁盘上的文件夹已不存在，仅剩记录。可用「删除」清理该记录。")
					: null,
				React.createElement(
					"div",
					{ className: "dsh-skillbox-actions" },
					state === "trial"
						? [
								React.createElement(
									"button",
									{
										key: "keep",
										type: "button",
										className: "dsh-skillbox-btn",
										disabled: busy,
										onClick: () => void store.decide(skill.name, "keep"),
									},
									"保留到 skill 包",
								),
								React.createElement(
									"button",
									{
										key: "delete",
										type: "button",
										className: "dsh-skillbox-btn dsh-skillbox-btn-danger",
										disabled: busy,
										onClick: () => void store.decide(skill.name, "delete"),
									},
									"删除该 skill",
								),
							]
						: null,
					React.createElement(
						"button",
						{
							type: "button",
							className: "dsh-skillbox-btn dsh-skillbox-btn-danger",
							disabled: busy,
							title: `删除 ${skill.name} 的文件夹与启用副本`,
							onClick: () => void store.remove(skill.name),
						},
						React.createElement(IconTrash, { size: 12 }),
						" 删除",
					),
				),
			)
		}

		/** The freshly generated skill: 试用 / 忽略. */
		function OfferCard({ offer, busy }) {
			const [expanded, setExpanded] = React.useState(false)
			return React.createElement(
				"div",
				{ className: "dsh-skillbox-card", "data-offer": offer.name },
				React.createElement(
					"div",
					{ className: "dsh-skillbox-card-head" },
					React.createElement("span", { className: "dsh-skillbox-name" }, offer.name),
					React.createElement("span", { className: STATE_CLASS.trial }, "待决定"),
				),
				React.createElement("div", { className: "dsh-skillbox-desc" }, offer.description),
				React.createElement(
					"div",
					{ className: "dsh-skillbox-actions" },
					React.createElement(
						"button",
						{
							type: "button",
							className: "dsh-skillbox-btn",
							disabled: busy,
							title: "把这个 skill 加入工作区，下一次对话时由模型调用",
							onClick: () => void store.decide(offer.name, "keep"),
						},
						"试用",
					),
					React.createElement(
						"button",
						{
							type: "button",
							className: "dsh-skillbox-btn dsh-skillbox-btn-danger",
							disabled: busy,
							title: "删除这个 skill 的文件",
							onClick: () => void store.ignore(offer.name),
						},
						"忽略",
					),
					React.createElement(
						"button",
						{
							type: "button",
							className: "dsh-skillbox-btn",
							onClick: () => setExpanded((value) => !value),
						},
						expanded ? "收起说明" : "查看说明",
					),
				),
				React.createElement(
					"div",
					{ className: "dsh-skillbox-note" },
					"「试用」= 保留在 skillbox 并启用（已写入工作区的 .dsh/skills），下一次对话模型即可调用；「忽略」= 立刻删除该 skill 的文件。",
				),
				expanded && typeof offer.body === "string"
					? React.createElement("pre", { className: "dsh-skillbox-pre" }, offer.body)
					: null,
			)
		}
		//#endregion

		/** The right-edge sidebar: collapsed rail and expanded skillbox browser. */
		function SkillboxPanel(props) {
			const state = useStore()
			const [open, setOpen] = React.useState(false)

			// Bind the panel to the Session on screen so the host resolves the right
			// workspace; a panel with no Session still works through the sandbox root.
			const sessionId = props?.sessionId
			React.useEffect(() => {
				boundSessionId = typeof sessionId === "string" && sessionId !== "" ? sessionId : null
				void store.load()
			}, [sessionId])

			// The skillbox can change behind this panel (the model's own decision tool
			// call, an editor, a shell command), so an open panel re-reads on a slow
			// poll instead of trusting its own last write.
			React.useEffect(() => {
				if (!open) return undefined
				const timer = setInterval(() => {
					void store.load()
				}, 5000)
				return () => clearInterval(timer)
			}, [open])

			const skills = state.skills ?? []
			const trialCount = skills.filter((skill) => skill.state === "trial").length
			const enabledCount = skills.filter((skill) => skill.enabled === true).length

			const rail = React.createElement(
				"div",
				{ className: "dsh-skillbox-rail" },
				React.createElement(
					"button",
					{
						type: "button",
						className: "dsh-skillbox-iconbtn",
						title: open ? "收起 skillbox 侧边栏" : "展开 skillbox 侧边栏",
						"aria-expanded": open,
						onClick: () => setOpen((value) => !value),
					},
					open ? React.createElement(IconClose, { size: 15 }) : React.createElement(IconBox, { size: 15 }),
				),
				React.createElement("span", { className: "dsh-skillbox-count", title: `skillbox 中 ${skills.length} 个 skill，${enabledCount} 个已启用` }, skills.length),
				trialCount > 0 ? React.createElement("span", { className: "dsh-skillbox-count", title: `${trialCount} 个 skill 待决定` }, trialCount) : null,
			)

			if (!open) return React.createElement("div", { className: "dsh-skillbox-root", "data-open": "false" }, rail)

			const body = React.createElement(
				"div",
				{ className: "dsh-skillbox-body" },
				React.createElement(
					"button",
					{
						type: "button",
						className: "dsh-skillbox-primary",
						disabled: state.busy === true,
						onClick: () => void store.generate(),
					},
					React.createElement(IconSpark, { size: 14 }),
					state.busy === true ? "正在生成…" : "生成随机 Skill",
				),
				state.error === null || state.error === undefined
					? null
					: React.createElement("div", { className: "dsh-skillbox-error" }, state.error),
				state.offer === null || state.offer === undefined
					? null
					: React.createElement(OfferCard, { offer: state.offer, busy: state.busy === true }),
				skills.length === 0
					? React.createElement(
							"div",
							{ className: "dsh-skillbox-empty" },
							"skillbox 还是空的。点上面的按钮生成一个随机 skill，或把已有的 SKILL.md 文件夹放进 skillbox 后刷新。",
						)
					: skills.map((skill) => React.createElement(SkillCard, { key: skill.name, skill, busy: state.busy === true })),
			)

			return React.createElement(
				"div",
				{ className: "dsh-skillbox-root", "data-open": "true" },
				React.createElement(
					"div",
					{ className: "dsh-skillbox-panel" },
					React.createElement(
						"div",
						{ className: "dsh-skillbox-head" },
						React.createElement("span", { className: "dsh-skillbox-title" }, "Skillbox"),
						React.createElement(
							"button",
							{
								type: "button",
								className: "dsh-skillbox-iconbtn",
								title: "重新读取 skillbox",
								disabled: state.busy === true,
								onClick: () => void store.load(),
							},
							React.createElement(IconRefresh, { size: 14 }),
						),
						React.createElement(
							"button",
							{
								type: "button",
								className: "dsh-skillbox-iconbtn",
								title: "收起侧边栏",
								onClick: () => setOpen(false),
							},
							React.createElement(IconClose, { size: 14 }),
						),
					),
					body,
					React.createElement(
						"div",
						{ className: "dsh-skillbox-foot" },
						React.createElement("span", { className: "dsh-skillbox-path", title: state.skillboxDir }, state.skillboxDir || "…"),
					),
				),
				rail,
			)
		}

		/** The sidebar-foot button: open the panel and generate one skill. */
		function GenerateButton() {
			const state = useStore()
			React.useEffect(() => {
				void store.load()
			}, [])
			return React.createElement(
				"button",
				{
					type: "button",
					className: "dsh-skillbox-iconbtn",
					title: "生成一个随机 skill 并试用（dsh-skillbox）",
					disabled: state.busy === true,
					onClick: () => void store.generate(),
				},
				React.createElement(IconSpark, { size: 15 }),
			)
		}

		/** The composer dock card: the trial lives where the conversation happens. */
		function OfferDock(props) {
			const state = useStore()
			const sessionId = props?.sessionId
			React.useEffect(() => {
				boundSessionId = typeof sessionId === "string" && sessionId !== "" ? sessionId : boundSessionId
				void store.load()
			}, [sessionId])
			const offer = state.offer
			if (offer === null || offer === undefined) return null
			return React.createElement(
				"div",
				{ className: "dsh-skillbox-offer" },
				React.createElement("div", { className: "dsh-skillbox-offer-title" }, "dsh-skillbox 生成了一个随机 skill"),
				React.createElement(OfferCard, { offer, busy: state.busy === true }),
			)
		}

		/** The host RPC face and the two shell seats this plugin occupies. */
		const inject = ["slots"]

		/**
		 * Client plugin body.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => {
				const disposers = []
				disposers.push(
					ctx.slots.inject("shell.overlay", () =>
						ctx.slots.register({ name: "shell.overlay", id: "dsh-skillbox.panel", order: 40, label: "Skillbox" }, SkillboxPanel),
					),
				)
				disposers.push(
					ctx.slots.inject("sidebar.footer.action", () =>
						ctx.slots.register({ name: "sidebar.footer.action", id: "dsh-skillbox.generate", order: 30, label: "生成随机 Skill" }, GenerateButton),
					),
				)
				disposers.push(
					ctx.slots.inject("conversation.input.dock", () =>
						ctx.slots.register({ name: "conversation.input.dock", id: "dsh-skillbox.offer", order: 15, label: "随机 Skill 试用" }, OfferDock),
					),
				)
				void store.load()
				return () => {
					for (const dispose of disposers.reverse()) dispose()
				}
			}, "dsh-skillbox: seats")
		}

		exports.apply = apply
		exports.inject = inject
		return module.exports
	},
})
