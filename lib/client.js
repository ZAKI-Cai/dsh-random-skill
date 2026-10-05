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
			".dsh-skillbox-rail{width:44px;flex:none;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0;background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-1));border-left:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);position:relative}",
			".dsh-skillbox-panel{width:336px;flex:none;display:flex;flex-direction:column;background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-1));border-left:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);box-shadow:-8px 0 24px rgba(0,0,0,.08)}",
			".dsh-skillbox-toggle{position:absolute;top:50%;left:0;transform:translate(-100%,-50%);width:26px;height:58px;margin-right:-1px;display:flex;align-items:center;justify-content:center;border:.5px solid var(--dsw-alias-border-l1);border-right:0;border-radius:9px 0 0 9px;background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-secondary);cursor:pointer;box-shadow:-4px 0 10px rgba(0,0,0,.06)}",
			".dsh-skillbox-toggle:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}",
			".dsh-skillbox-toggle:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}",
			".dsh-skillbox-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:.5px solid var(--dsw-alias-border-l1)}",
			".dsh-skillbox-title{font-size:13px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsh-skillbox-iconbtn{width:26px;height:26px;flex:none;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}",
			".dsh-skillbox-iconbtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}",
			".dsh-skillbox-iconbtn[disabled]{opacity:.45;cursor:default}",
			".dsh-skillbox-body{flex:1;min-height:0;overflow-y:auto;padding:8px 10px 14px;display:flex;flex-direction:column;gap:8px}",
			".dsh-skillbox-list{display:flex;flex-direction:column;gap:8px}",
			".dsh-skillbox-iconbtn:focus-visible,.dsh-skillbox-btn:focus-visible,.dsh-skillbox-generate:focus-visible,.dsh-skillbox-switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}",
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
			".dsh-skillbox-generate{display:flex;align-items:center;justify-content:center;gap:7px;flex:none;margin:0;padding:11px 12px;border:0;border-top:.5px solid var(--dsw-alias-border-l1);background:linear-gradient(0deg,var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-brand-primary);font-size:13px;font-weight:600;cursor:pointer}",
			".dsh-skillbox-generate:hover{background:var(--dsw-alias-bg-layer-2)}",
			".dsh-skillbox-generate[disabled]{opacity:.6;cursor:default}",
			".dsh-skillbox-generate-hint{font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary)}",
			".dsh-skillbox-author{border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;background:var(--dsw-alias-bg-layer-1)}",
			".dsh-skillbox-author-head{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600}",
			".dsh-skillbox-spin{width:13px;height:13px;flex:none;border-radius:50%;border:1.6px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);animation:dsh-skillbox-spin .9s linear infinite}",
			"@keyframes dsh-skillbox-spin{to{transform:rotate(360deg)}}",
			".dsh-skillbox-author-phase{font-size:11.5px;color:var(--dsw-alias-label-secondary)}",
			".dsh-skillbox-chips{display:flex;flex-wrap:wrap;gap:5px}",
			".dsh-skillbox-chip{display:inline-flex;align-items:center;height:19px;padding:0 7px;border-radius:6px;font-size:11px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border:.5px solid var(--dsw-alias-border-l1)}",
			".dsh-skillbox-chip-brand{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}",
			".dsh-skillbox-bar{position:relative;height:4px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}",
			".dsh-skillbox-bar-fill{position:absolute;top:0;left:0;bottom:0;border-radius:3px;background:var(--dsw-alias-brand-primary);animation:dsh-skillbox-bar 1.6s ease-in-out infinite}",
			"@keyframes dsh-skillbox-bar{0%{left:0;width:12%}50%{left:44%;width:46%}100%{left:100%;width:12%}}",
			".dsh-skillbox-meta{font-size:11px;color:var(--dsw-alias-label-secondary)}",
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

		//#region skillbox: client/<core> (generated from lib/client-core.js — do not edit by hand)

		  /**
		   * Contract values the browser half cannot import from the host. `contract.mjs`
		   * asserts this table equals `lib/contract.js`, and `client-core.mjs` asserts
		   * `client.js` no longer restates them.
		   */
		  var CONTRACT = {
		    API_PREFIX: '/api/skillbox',
		    API_VERSION: 1,
		    CLIENT_METHODS: ['info', 'list', 'catalogue', 'pending', 'refresh', 'diagnose', 'kick', 'replay', 'toggle', 'decide', 'remove', 'state'],
		    ERROR_CODES: {
		      WORKSPACE_REFUSED: 'workspace-refused',
		      CONFIG_DIR_REFUSED: 'config-dir-refused',
		      UNKNOWN_SKILL: 'unknown-skill',
		      INVALID_NAME: 'invalid-name',
		      UNKNOWN_DECISION: 'unknown-decision',
		      NO_MATCHING_TOPIC: 'no-matching-topic',
		      NAME_EXHAUSTED: 'name-exhausted',
		      BODY_TOO_LARGE: 'body-too-large',
		      BAD_JSON: 'bad-json',
		      UNKNOWN_METHOD: 'unknown-method',
		      METHOD_NOT_ALLOWED: 'method-not-allowed',
		      METADATA_UNREADABLE: 'metadata-unreadable',
		      UNAUTHORIZED: 'unauthorized',
		      INTERNAL: 'internal',
		    },
		    ERROR_TEXT: {
		      'workspace-refused': '请求指向了别的工作区，已拒绝。',
		      'config-dir-refused': '请求指向了 DSH 配置目录，已拒绝。',
		      'unknown-skill': '该 skill 已不存在，可能已被删除。',
		      'invalid-name': 'skill 名称不合法。',
		      'no-matching-topic': '没有匹配的领域或任务族。',
		      'name-exhausted': '重名太多次，请先清理 skillbox。',
		      'metadata-unreadable': 'skillbox 元数据不可读写。',
		      unauthorized: '浏览器会话未通过认证，请刷新页面。',
		    },
		  }

		  /**
		   * Build the browser half's API caller and store.
		   *
		   * @param env - injected environment: `fetch`, `now`, `random`, `interval`,
		   *   `clearInterval`, `onListenerError`.
		   * @returns the core exports.
		   */
		  function createClientCore(env) {
		    var options = env || {}
		    var API_PREFIX = CONTRACT.API_PREFIX
		    var API_VERSION = CONTRACT.API_VERSION
		    var CLIENT_METHODS = CONTRACT.CLIENT_METHODS
		    var ERROR_CODES = CONTRACT.ERROR_CODES
		    var ERROR_TEXT = CONTRACT.ERROR_TEXT
		    var fetchImpl = options.fetch || (typeof fetch === 'function' ? fetch : undefined)
		    var now = options.now || function () { return Date.now() }
		    var random = options.random || Math.random
		    var setIntervalImpl = options.interval || function (callback, ms) { return setInterval(callback, ms) }
		    var clearIntervalImpl = options.clearInterval || function (handle) { return clearInterval(handle) }

		    /** Session the panel is currently reading for, when a Session is on screen. */
		    var boundSessionId = null

		    /** A host failure carrying its stable code, so callers never match on text. */
		    function HostError(code, message, details) {
		      this.name = 'HostError'
		      this.code = code
		      this.message = message
		      this.details = details
		      this.stack = new Error(message).stack
		    }
		    HostError.prototype = Object.create(Error.prototype)
		    HostError.prototype.constructor = HostError
		    Object.defineProperty(HostError.prototype, 'display', {
		      get: function () {
		        var hint = ERROR_TEXT[this.code]
		        return hint === undefined ? this.message : hint + '（' + this.message + '）'
		      },
		    })

		    /**
		     * Call one host method.
		     * @throws {HostError} for a host-reported failure, a transport failure, or a
		     *   contract-version mismatch.
		     */
		    async function call(method, payload) {
		      if (CLIENT_METHODS.indexOf(method) === -1) {
		        throw new HostError(ERROR_CODES.UNKNOWN_METHOD, '客户端调用了契约外的方法 "' + method + '"')
		      }
		      if (fetchImpl === undefined) {
		        throw new HostError(ERROR_CODES.INTERNAL, '当前环境没有 fetch，无法连接 dsh-skillbox 主机半')
		      }
		      var query = boundSessionId === null ? '' : '?sessionId=' + encodeURIComponent(boundSessionId)
		      var response
		      try {
		        response = await fetchImpl(API_PREFIX + '/' + method + query, {
		          method: 'POST',
		          headers: { 'content-type': 'application/json' },
		          body: JSON.stringify(payload || {}),
		        })
		      } catch (error) {
		        throw new HostError(ERROR_CODES.INTERNAL, '无法连接 dsh-skillbox 主机半：' + String((error && error.message) || error))
		      }
		      var decoded = await response.json().catch(function () { return null })
		      if (decoded === null) {
		        throw new HostError(ERROR_CODES.INTERNAL, method + ' 返回了无法解析的响应（HTTP ' + response.status + '）')
		      }
		      if (decoded.ok !== true) {
		        throw new HostError(
		          String(decoded.code || ERROR_CODES.INTERNAL),
		          String(decoded.error || method + ' 失败'),
		          decoded.details,
		        )
		      }
		      if (decoded.apiVersion !== API_VERSION) {
		        throw new HostError(
		          ERROR_CODES.INTERNAL,
		          '主机半的契约版本是 ' + decoded.apiVersion + '，客户端是 ' + API_VERSION + '；请重启 DSH 或更新插件',
		        )
		      }
		      return decoded
		    }

		    /** Ask the host what it serves, and report drift rather than failing later. */
		    async function handshake() {
		      try {
		        var info = await call('info', {})
		        var missing = CLIENT_METHODS.filter(function (method) {
		          return (info.methods || []).indexOf(method) === -1
		        })
		        return { apiVersion: info.apiVersion, missing: missing, info: info }
		      } catch (error) {
		        return { apiVersion: null, missing: [], info: null, error: String((error && error.message) || error) }
		      }
		    }

		    /** Initial store shape. */
		    function initial() {
		      return {
		        ready: false,
		        busy: false,
		        error: null,
		        root: '',
		        skillboxDir: '',
		        enabledDir: '',
		        skills: [],
		        pending: null,
		        offer: null,
		        lastGenerated: null,
		        progress: null,
		        catalogue: null,
		        contract: null,
		        replay: null,
		      }
		    }

		    /** The shared store: one snapshot, every seat reads it. */
		    var state = initial()
		    var listeners = new Set()
		    function emit() {
		      var snapshot = Array.from(listeners)
		      for (var index = 0; index < snapshot.length; index += 1) {
		        try {
		          snapshot[index]()
		        } catch (error) {
		          if (options.onListenerError) options.onListenerError(error)
		        }
		      }
		    }
		    var store = {
		      get: function () { return state },
		      set: function (patch) {
		        state = Object.assign({}, state, patch)
		        emit()
		      },
		      subscribe: function (listener) {
		        listeners.add(listener)
		        return function () { listeners.delete(listener) }
		      },
		    }

		    var authoringTimer
		    function failureText(error) {
		      return (error && error.display) || String((error && error.message) || error)
		    }

		    var api = {
		      /** Bind the panel to the Session on screen. */
		      bindSession: function (sessionId) {
		        boundSessionId = typeof sessionId === 'string' && sessionId !== '' ? sessionId : null
		        return boundSessionId
		      },
		      boundSession: function () { return boundSessionId },

		      /** Read the skillbox from the host. */
		      load: async function () {
		        try {
		          var pendingResult = await call('pending', {})
		          var view = await call('list', {})
		          store.set({
		            ready: true,
		            error: null,
		            root: view.root,
		            skillboxDir: view.skillboxDir,
		            enabledDir: view.enabledDir,
		            skills: view.skills || [],
		            pending: view.pending || null,
		            offer: pendingResult.offer || null,
		          })
		        } catch (error) {
		          store.set({ ready: true, error: failureText(error) })
		        }
		      },

		      /** Read the generation catalogue. */
		      catalogue: async function () {
		        try {
		          var result = await call('catalogue', {})
		          store.set({
		            catalogue: {
		              domains: result.domains || [],
		              recipes: result.recipes || [],
		              families: result.families || 0,
		              combinations: result.combinations || 0,
		              window: result.window || null,
		              minDocumentChars: result.minDocumentChars || 0,
		            },
		          })
		        } catch (error) {
		          store.set({ error: failureText(error) })
		        }
		      },

		      /** Ask the host what it serves. */
		      contractCheck: async function () {
		        var result = await handshake()
		        store.set({ contract: result })
		        return result
		      },

		      /**
		       * Generate one random skill.
		       *
		       * The host composes the document locally and immediately; this wraps that in
		       * the authoring window the user asked for, so the interface shows a
		       * topic-selection phase and then a document phase instead of a single blink.
		       */
		      generate: async function (generationOptions) {
		        if (store.get().progress !== null) return null
		        var startedAt = now()
		        store.set({ busy: true, error: null, progress: { phase: 'select', startedAt: startedAt, topicMs: 7000, skill: null } })
		        try {
		          var payload =
		            (!generationOptions || (generationOptions.domainId === undefined && generationOptions.familyId === undefined))
		              ? {}
		              : { topic: { domainId: generationOptions.domainId, familyId: generationOptions.familyId } }
		          var result = await call('kick', payload)
		          var win = result.window || (result.skill && result.skill.window) || {}
		          var minMs = win.selectMinMs || 5000
		          var maxMs = win.selectMaxMs || 10000
		          var topicMs = minMs + Math.floor(random() * Math.max(1, maxMs - minMs))
		          store.set({
		            busy: false,
		            error: null,
		            root: result.view.root,
		            skillboxDir: result.view.skillboxDir,
		            enabledDir: result.view.enabledDir,
		            skills: result.view.skills || [],
		            pending: result.view.pending || null,
		            offer: Object.assign({}, result.skill, { state: 'trial' }),
		            lastGenerated: result.skill,
		            progress: { phase: 'select', startedAt: startedAt, topicMs: topicMs, window: win, skill: result.skill },
		          })
		          return result.skill
		        } catch (error) {
		          store.set({ busy: false, error: failureText(error), progress: null })
		          return null
		        }
		      },

		      /**
		       * Drive the authoring window on a timer.
		       *
		       * @param onPhase - called when the phase changes, so a view can focus or
		       *   announce without polling the store.
		       */
		      startAuthoringClock: function (onPhase) {
		        if (authoringTimer !== undefined) clearIntervalImpl(authoringTimer)
		        authoringTimer = setIntervalImpl(function () {
		          var current = store.get().progress
		          if (current === null || current.phase !== 'select') return
		          if (now() - current.startedAt < (current.topicMs || 7000)) return
		          store.set({ progress: Object.assign({}, current, { phase: 'author', authoredAt: now() }) })
		          if (onPhase) onPhase('author')
		        }, 500)
		        var progress = store.get().progress
		        return progress === null ? null : progress.phase
		      },

		      /** Stop the authoring clock (the panel collapsed or unmounted). */
		      stopAuthoringClock: function () {
		        if (authoringTimer === undefined) return
		        clearIntervalImpl(authoringTimer)
		        authoringTimer = undefined
		      },

		      /** Move the authoring window from topic selection to document authoring now. */
		      beginAuthoring: function () {
		        var current = store.get().progress
		        if (current === null || current.phase !== 'select') return
		        store.set({ progress: Object.assign({}, current, { phase: 'author', authoredAt: now() }) })
		      },

		      /** Abandon the authoring window and delete the just-written skill. */
		      cancelGeneration: async function () {
		        var current = store.get().progress
		        if (current === null) return
		        var name = current.skill && current.skill.name
		        store.set({ busy: true, error: null })
		        if (typeof name === 'string' && name !== '') await api.remove(name)
		        store.set({ progress: null, offer: null, lastGenerated: null, busy: false })
		      },

		      /** Discard the freshly generated skill. */
		      ignore: async function (name) {
		        store.set({ busy: true, error: null })
		        try {
		          var result = await call('remove', { name: name })
		          store.set({
		            busy: false,
		            skills: result.view.skills || [],
		            pending: result.view.pending || null,
		            offer: null,
		            progress: null,
		          })
		        } catch (error) {
		          store.set({ busy: false, error: failureText(error) })
		        }
		      },

		      /** Keep the skill in the skillbox (the trial result is accepted). */
		      decide: async function (name, decision) {
		        store.set({ busy: true, error: null })
		        try {
		          var result = await call('decide', { name: name, decision: decision })
		          store.set({
		            busy: false,
		            skills: result.view.skills || [],
		            pending: result.view.pending || null,
		            offer: null,
		            lastGenerated: null,
		            progress: null,
		          })
		        } catch (error) {
		          store.set({ busy: false, error: failureText(error) })
		        }
		      },

		      /** Enable or disable one skill in the workspace catalog. */
		      toggle: async function (name, enabled) {
		        store.set({ busy: true, error: null })
		        try {
		          var result = await call('toggle', { name: name, enabled: enabled })
		          store.set({ busy: false, skills: result.view.skills || [], pending: result.view.pending || null })
		        } catch (error) {
		          store.set({ busy: false, error: failureText(error) })
		        }
		      },

		      /** Delete one skill's folder and its enabled copy. */
		      remove: async function (name) {
		        store.set({ busy: true, error: null })
		        try {
		          var result = await call('remove', { name: name })
		          store.set({ busy: false, skills: result.view.skills || [], pending: result.view.pending || null })
		        } catch (error) {
		          store.set({ busy: false, error: failureText(error) })
		        }
		      },

		      /** Re-derive a skill from its seed and compare with the file on disk. */
		      replay: async function (name) {
		        store.set({ busy: true, error: null })
		        try {
		          var result = await call('replay', { name: name })
		          store.set({
		            busy: false,
		            replay: {
		              name: result.name,
		              seed: result.seed,
		              replayedName: result.replayedName,
		              domainLabel: result.domainLabel,
		              characters: result.characters,
		              reproducible: result.reproducible,
		              differences: result.differences || [],
		            },
		          })
		        } catch (error) {
		          store.set({ busy: false, error: failureText(error) })
		        }
		      },

		      /** Drop the last replay report. */
		      clearReplay: function () {
		        store.set({ replay: null })
		      },
		    }

		    return {
		      store: store,
		      api: api,
		      call: call,
		      handshake: handshake,
		      HostError: HostError,
		      contract: CONTRACT,
		      reset: function () { store.set(initial()) },
		    }
		  }

		  // Two call sites read this factory, so it is exposed both ways:
		  //
		  // - inlining (the shipped bundle): `.selftest/sync-client-core.mjs` copies the body
		  //   of this file into `lib/client.js`, where the bare `createClientCore`
		  //   declaration is already in scope — no global is involved;
		  // - a Node test that evaluates this file alone (`.selftest/client-core.mjs`): it
		  //   reads the global set below.
		//#endregion skillbox: client/<core>

		/**
		 * One facade over the core's snapshot and its actions.
		 *
		 * Components read `store.get()` and call `store.generate()`, `store.decide()`
		 * and friends, so keeping both halves on one object means a component never has
		 * to know which half an action lives in.
		 */
		const { store: stateStore, api } = createClientCore({
			onListenerError: (error) => console.error("[skillbox] listener failed:", error),
		})
		const store = Object.assign({}, api, {
			get: stateStore.get,
			set: stateStore.set,
			subscribe: stateStore.subscribe,
		})

		/**
		 * Subscribe a component to the shared store.
		 * @returns the current snapshot; re-renders the caller on every change.
		 */
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
		/** `direction` is the side the chevron points at: "left" expands, "right" collapses. */
		const IconChevron = (props) =>
			props?.direction === "right"
				? icon(["M6 3.5 10.5 8 6 12.5"], props?.size)
				: icon(["M10 3.5 5.5 8 10 12.5"], props?.size)
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

		/** One skillbox row: state, enable switch, replay, delete. */
		function SkillCard({ skill, busy }) {
			const state = skill.state ?? "kept"
			const missing = skill.missing === true
			const replayed = useStore().replay
			const showsReplay = replayed !== null && replayed !== undefined && replayed.name === skill.name
			return React.createElement(
				"article",
				{
					className: "dsh-skillbox-card",
					"data-skill": skill.name,
					"aria-label": `${skill.name}，${STATE_LABEL[state] ?? state}，${skill.enabled === true ? "已启用" : "未启用"}`,
				},
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
				showsReplay
					? React.createElement(
							"div",
							{ className: "dsh-skillbox-note", role: "status" },
							replayed.reproducible
								? `种子 ${replayed.seed} 重放成功：正文与磁盘文件逐字一致。`
								: `种子 ${replayed.seed} 重放结果与磁盘不一致：${replayed.differences.join("；")}`,
						)
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
					missing || typeof skill.seed !== "number"
						? null
						: React.createElement(
								"button",
								{
									type: "button",
									className: "dsh-skillbox-btn",
									disabled: busy,
									title: `用种子 ${skill.seed} 重新生成一份并逐字比对`,
									onClick: () => void store.replay(skill.name),
								},
								"重放校验",
							),
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

		/**
		 * The authoring window: topic selection first, then document authoring.
		 *
		 * The document already exists when this renders — the host composes locally —
		 * so the window is what the user asked to see rather than an invented wait: the
		 * topic is presented for the selection window, then the card reports how long the
		 * document took to write and how large it is.
		 *
		 * @param props - `{ progress, onSettle }`.
		 */
		function AuthoringCard({ progress }) {
			const [, tick] = React.useState(0)
			const window_ = progress.window ?? {}
			const authorMax = window_.authorMaxMs ?? 420000

			React.useEffect(() => {
				const timer = setInterval(() => tick((value) => value + 1), 500)
				return () => clearInterval(timer)
			}, [])

			// Topic selection settles on its own window; the document phase is open-ended
			// up to the authoring maximum, and the offer card below answers it.
			React.useEffect(() => {
				if (progress.phase !== "select") return undefined
				const elapsed = Date.now() - progress.startedAt
				const remaining = Math.max(0, (progress.topicMs ?? 7000) - elapsed)
				const timer = setTimeout(() => store.beginAuthoring(), remaining)
				return () => clearTimeout(timer)
			}, [progress.phase, progress.startedAt, progress.topicMs])

			const elapsed = Date.now() - progress.startedAt
			const seconds = Math.round(elapsed / 1000)
			const authorElapsed = progress.authoredAt === undefined ? null : Date.now() - progress.authoredAt

			if (progress.phase === "select") {
				return React.createElement(
					"div",
					{
						className: "dsh-skillbox-author",
						"data-phase": "select",
						role: "status",
						"aria-live": "polite",
						"aria-busy": "true",
					},
					React.createElement(
						"div",
						{ className: "dsh-skillbox-author-head" },
						React.createElement("span", { className: "dsh-skillbox-spin", "aria-hidden": "true" }),
						"正在选取 skill 主题…",
					),
					React.createElement(
						"div",
						{ className: "dsh-skillbox-author-phase" },
						`在 ${store.get().catalogue?.families ?? "全部"} 个任务族里抽题，已用 ${seconds}s（窗口 5–10s）`,
					),
					React.createElement(
						"div",
						{ className: "dsh-skillbox-bar" },
						React.createElement("div", { className: "dsh-skillbox-bar-fill" }),
					),
				)
			}

			const topic = progress.skill?.topic
			return React.createElement(
				"div",
				{
					className: "dsh-skillbox-author",
					"data-phase": "author",
					role: "status",
					"aria-live": "polite",
					"aria-busy": "true",
				},
				React.createElement(
					"div",
					{ className: "dsh-skillbox-author-head" },
					React.createElement("span", { className: "dsh-skillbox-spin", "aria-hidden": "true" }),
					"已选中主题，正在编写 skill 文档…",
				),
				topic === undefined || topic === null
					? null
					: React.createElement(
							"div",
							{ className: "dsh-skillbox-chips" },
							React.createElement("span", { className: "dsh-skillbox-chip dsh-skillbox-chip-brand" }, topic.domain),
							React.createElement("span", { className: "dsh-skillbox-chip" }, topic.familySubject),
							React.createElement("span", { className: "dsh-skillbox-chip" }, topic.recipe),
							React.createElement("span", { className: "dsh-skillbox-chip" }, topic.style),
							React.createElement("span", { className: "dsh-skillbox-chip" }, topic.codeName),
						),
				React.createElement(
					"div",
					{ className: "dsh-skillbox-author-phase" },
					`主题范围：${topic?.scope ?? "—"} ｜ 产出：${topic?.deliverable ?? "—"} ｜ 读者：${topic?.audience ?? "—"}`,
				),
				React.createElement(
					"div",
					{ className: "dsh-skillbox-bar" },
					React.createElement("div", { className: "dsh-skillbox-bar-fill" }),
				),
				React.createElement(
					"div",
					{ className: "dsh-skillbox-meta" },
					authorElapsed === null
						? `编写窗口最长 ${Math.round(authorMax / 60000)} 分钟；文档已生成，可随时在下方决定去留。`
						: `已用 ${seconds}s（编写窗口 1–7 分钟）｜ 文档 ${progress.skill?.characters ?? 0} 字` +
							(progress.skill?.validation?.ok === false ? ` ｜ 未达标：${progress.skill.validation.problems.join("、")}` : " ｜ 结构校验通过"),
				),
				React.createElement(
					"div",
					{ className: "dsh-skillbox-actions" },
					React.createElement(
						"button",
						{
							type: "button",
							className: "dsh-skillbox-btn dsh-skillbox-btn-danger",
							disabled: store.get().busy === true,
							onClick: () => void store.cancelGeneration(),
						},
						"取消并删除",
					),
				),
			)
		}

		/** The freshly generated skill: 试用 / 忽略. */
		function OfferCard({ offer, busy }) {
			const [expanded, setExpanded] = React.useState(false)
			const chips = [
				offer.domainLabel,
				offer.familySubject,
				offer.recipeLabel,
				offer.style,
				typeof offer.seed === "number" ? `种子 ${offer.seed}` : null,
			].filter((value) => typeof value === "string" && value !== "")
			return React.createElement(
				"div",
				{ className: "dsh-skillbox-card", "data-offer": offer.name },
				React.createElement(
					"div",
					{ className: "dsh-skillbox-card-head" },
					React.createElement("span", { className: "dsh-skillbox-name" }, offer.name),
					React.createElement("span", { className: STATE_CLASS.trial }, "待决定"),
				),
				chips.length === 0
					? null
					: React.createElement(
							"div",
							{ className: "dsh-skillbox-chips" },
							chips.map((chip, index) =>
								React.createElement(
									"span",
									{ key: chip, className: `dsh-skillbox-chip${index === 0 ? " dsh-skillbox-chip-brand" : ""}` },
									chip,
								),
							),
						),
				React.createElement("div", { className: "dsh-skillbox-desc" }, offer.description),
				typeof offer.characters === "number"
					? React.createElement(
							"div",
							{ className: "dsh-skillbox-meta" },
							`${offer.characters} 字` +
								(offer.validation === undefined || offer.validation === null
									? ""
									: offer.validation.ok === true
										? " ｜ 结构校验通过（触发条件/步骤/硬约束/产出/闸门/术语/升级齐备）"
										: ` ｜ 结构校验未过：${offer.validation.problems.join("、")}`),
						)
					: null,
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
			const toggleRef = React.useRef(null)

			// Bind the panel to the Session on screen so the host resolves the right
			// workspace; a panel with no Session still works through the sandbox root.
			const sessionId = props?.sessionId
			React.useEffect(() => {
				boundSessionId = typeof sessionId === "string" && sessionId !== "" ? sessionId : null
				void store.load()
				void store.catalogue()
				void store.contractCheck()
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

			// Editing or reviewing happens elsewhere on screen while this panel is open,
			// so it must be dismissable from the keyboard and must hand focus back to
			// the control that owns it. Collapsing moves focus to the rail control;
			// expanding returns it to the same control, which is the panel's anchor.
			React.useEffect(() => {
				const onKeyDown = (event) => {
					if (event.key === "Escape" && open) {
						event.stopPropagation()
						setOpen(false)
					}
				}
				document.addEventListener("keydown", onKeyDown)
				return () => document.removeEventListener("keydown", onKeyDown)
			}, [open])

			React.useEffect(() => {
				const button = toggleRef.current
				if (button !== null && typeof button.focus === "function" && button.dataset.focusPending === "true") {
					delete button.dataset.focusPending
					button.focus()
				}
			}, [open])

			const skills = state.skills ?? []
			const trialCount = skills.filter((skill) => skill.state === "trial").length
			const enabledCount = skills.filter((skill) => skill.enabled === true).length
			const drift = state.contract !== null && state.contract !== undefined && state.contract.missing?.length > 0

			const rail = React.createElement(
				"div",
				{ className: "dsh-skillbox-rail" },
				// The collapse/expand control rides the rail's left edge, vertically
				// centred: a left chevron when the panel is collapsed, a right one when
				// it is open. Both controls are the same action, so both ask for focus
				// back after the panel re-renders.
				React.createElement(
					"button",
					{
						type: "button",
						ref: toggleRef,
						className: "dsh-skillbox-toggle",
						title: open ? "收纳 skillbox 侧边栏" : "展开 skillbox 侧边栏",
						"aria-label": open ? "收纳 skillbox 侧边栏" : "展开 skillbox 侧边栏",
						"aria-expanded": open,
						"aria-controls": "dsh-skillbox-panel",
						onClick: (event) => {
							event.currentTarget.dataset.focusPending = "true"
							setOpen((value) => !value)
						},
					},
					React.createElement(IconChevron, { size: 16, direction: open ? "right" : "left" }),
				),
				React.createElement(
					"button",
					{
						type: "button",
						className: "dsh-skillbox-iconbtn",
						title: open ? "收纳 skillbox 侧边栏" : "展开 skillbox 侧边栏",
						"aria-label": open ? "收纳 skillbox 侧边栏" : "展开 skillbox 侧边栏",
						"aria-expanded": open,
						"aria-controls": "dsh-skillbox-panel",
						onClick: (event) => {
							event.currentTarget.dataset.focusPending = "true"
							setOpen((value) => !value)
						},
					},
					open ? React.createElement(IconClose, { size: 15 }) : React.createElement(IconBox, { size: 15 }),
				),
				React.createElement(
					"span",
					{ className: "dsh-skillbox-count", title: `skillbox 中 ${skills.length} 个 skill，${enabledCount} 个已启用` },
					skills.length,
				),
				trialCount > 0
					? React.createElement("span", { className: "dsh-skillbox-count", title: `${trialCount} 个 skill 待决定` }, trialCount)
					: null,
			)

			if (!open) return React.createElement("div", { className: "dsh-skillbox-root", "data-open": "false" }, rail)

			const authoring = state.progress !== null && state.progress.phase !== "ready"
			const body = React.createElement(
				"div",
				{ className: "dsh-skillbox-body" },
				state.error === null || state.error === undefined
					? null
					: React.createElement("div", { className: "dsh-skillbox-error", role: "alert" }, state.error),
				drift
					? React.createElement(
							"div",
							{ className: "dsh-skillbox-error", role: "alert" },
							`客户端与主机半的方法集不一致：主机缺少 ${state.contract.missing.join("、")}。请重启 DSH 或更新插件。`,
						)
					: null,
				authoring ? React.createElement(AuthoringCard, { progress: state.progress }) : null,
				!authoring && (state.offer === null || state.offer === undefined)
					? null
					: authoring
						? null
						: React.createElement(OfferCard, { offer: state.offer, busy: state.busy === true }),
				skills.length === 0
					? React.createElement(
							"div",
							{ className: "dsh-skillbox-empty" },
							"skillbox 还是空的。点下面的「生成随机 Skill」按钮造一个，或把已有的 SKILL.md 文件夹放进 skillbox 后刷新。",
						)
					: React.createElement(
							"div",
							{ className: "dsh-skillbox-list", role: "list", "aria-label": "skillbox 中的 skill" },
							skills.map((skill) => React.createElement(SkillCard, { key: skill.name, skill, busy: state.busy === true })),
						),
			)

			// The panel's foot: where the skillbox lives and what the generator can draw
			// from, then the one action that produces content at the very bottom edge.
			const catalogue = state.catalogue
			const foot = React.createElement(
				"div",
				{ className: "dsh-skillbox-foot" },
				React.createElement("span", { className: "dsh-skillbox-path", title: state.skillboxDir }, state.skillboxDir || "…"),
				catalogue === null || catalogue === undefined
					? null
					: React.createElement(
							"span",
							{
								className: "dsh-skillbox-meta",
								title: catalogue.domains.map((domain) => `${domain.label}：${domain.families.length} 族`).join("\n"),
							},
							`${catalogue.domains.length} 域 / ${catalogue.families} 族 / ${catalogue.combinations} 组合`,
						),
			)

			const generateBar = React.createElement(
				"button",
				{
					type: "button",
					className: "dsh-skillbox-generate",
					disabled: state.busy === true || authoring,
					title: "生成一个完全随机的 skill，然后选择「试用」或「忽略」",
					onClick: () => void store.generate(),
				},
				React.createElement(IconSpark, { size: 15 }),
				React.createElement("span", null, authoring ? "正在生成…" : "生成随机 Skill"),
				React.createElement("span", { className: "dsh-skillbox-generate-hint" }, "随机"),
			)

			return React.createElement(
				"div",
				{ className: "dsh-skillbox-root", "data-open": "true" },
				React.createElement(
					"section",
					{
						className: "dsh-skillbox-panel",
						id: "dsh-skillbox-panel",
						role: "complementary",
						"aria-label": "Skillbox 侧边栏",
					},
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
					),
					body,
					foot,
					generateBar,
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
			const authoring = state.progress !== null && state.progress.phase !== "ready"
			return React.createElement(
				"button",
				{
					type: "button",
					className: "dsh-skillbox-iconbtn",
					title: authoring ? "正在生成随机 skill…" : "生成一个随机 skill 并试用（dsh-skillbox）",
					disabled: state.busy === true || authoring,
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
			const authoring = state.progress !== null && state.progress.phase !== "ready"
			const offer = state.offer
			if (!authoring && (offer === null || offer === undefined)) return null
			return React.createElement(
				"div",
				{ className: "dsh-skillbox-offer" },
				React.createElement(
					"div",
					{ className: "dsh-skillbox-offer-title" },
					authoring
						? state.progress.phase === "select"
							? "dsh-skillbox 正在选取 skill 主题"
							: "dsh-skillbox 正在编写 skill 文档"
						: "dsh-skillbox 生成了一个随机 skill",
				),
				authoring
					? React.createElement(AuthoringCard, { progress: state.progress })
					: React.createElement(OfferCard, { offer, busy: state.busy === true }),
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
