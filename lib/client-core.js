/* eslint-disable */
/**
 * Browser-half core: the part of the client that is not React.
 *
 * The API caller, the shared store, the authoring-window clock, and the failure
 * vocabulary live here, with no DOM and no React dependency, so they can be unit
 * tested in Node against a fake `fetch` and a fake clock
 * (`.selftest/client-core.mjs`). `client.js` consumes this file's factory at load
 * time and only holds the React components.
 *
 * Classic-script IIFE by design: the file is served to the browser as a plain
 * `<script>` source in a combo together with `client.js`, so it must not use `import`
 * or `export`. The factory also returns its exports so a test can call it directly.
 *
 * @module dsh-skillbox/client-core
 */
;(function () {
  'use strict'

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
        /**
         * Sticky generation controls, kept in the store rather than in component
         * state because several seats (rail, panel, composer dock) read them and one
         * of them may unmount at any time.
         *
         * `domainId: ''` means "draw from the whole catalogue"; `depth: ''` means
         * "use whatever depth the host defaults to".
         */
        domainId: '',
        depth: '',
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
       * Choose the domain future draws come from.
       *
       * @param domainId - a catalogue domain id, or `''` for the whole catalogue.
       */
      setDomain: function (domainId) {
        store.set({ domainId: typeof domainId === 'string' ? domainId : '' })
      },

      /** Choose the depth future draws use; `''` leaves the host default in place. */
      setDepth: function (depth) {
        store.set({ depth: typeof depth === 'string' ? depth : '' })
      },

      /**
       * Generate one random skill.
       *
       * The host composes the document locally and immediately; this wraps that in
       * the authoring window the user asked for, so the interface shows a
       * topic-selection phase and then a document phase instead of a single blink.
       *
       * The sticky domain and depth controls are read here rather than passed by the
       * caller, so every entry point (rail button, composer dock, panel bar) draws
       * with the same settings.
       *
       * @param generationOptions - optional one-off `{ domainId, familyId, depth }`
       *   override; omitted fields fall back to the sticky values.
       */
      generate: async function (generationOptions) {
        if (store.get().progress !== null) return null
        var sticky = store.get()
        var domainId = generationOptions && generationOptions.domainId !== undefined ? generationOptions.domainId : sticky.domainId
        var familyId = generationOptions ? generationOptions.familyId : undefined
        var depth = generationOptions && generationOptions.depth !== undefined ? generationOptions.depth : sticky.depth
        var startedAt = now()
        store.set({ busy: true, error: null, progress: { phase: 'select', startedAt: startedAt, topicMs: 7000, skill: null } })
        try {
          var payload = {}
          if (domainId || familyId) payload.topic = { domainId: domainId || undefined, familyId: familyId }
          if (depth) payload.depth = depth
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
  if (typeof globalThis !== 'undefined') globalThis.__dshSkillboxCore = createClientCore
  if (typeof module !== 'undefined' && module !== null && module.exports) {
    module.exports = { createClientCore: createClientCore, CONTRACT: CONTRACT }
  }
})()
