/**
 * dsh-skillbox — host half.
 *
 * Owns the workspace-local `skillbox` folder, the random skill generator, the
 * trial/keep/delete lifecycle, and the small HTTP face the browser half calls.
 * The browser half (`./client`) draws the generation button and the right-edge
 * sidebar; this half is the single writer of skillbox state.
 *
 * @module dsh-skillbox
 */

import { watch } from 'node:fs'
import { resolve } from 'node:path'

import { generateSkill } from './generator.js'
import { Skillbox } from './store.js'
import { registerTools } from './tools.js'

/** Cordis plugin name. */
export const name = 'skillbox'

/**
 * No hard service dependency: every capability is read through `ctx.get(name)`
 * and degrades to a no-op when a composition mounts this plugin without it.
 */
export const inject = []

/** HTTP prefix owned by this plugin's client face. */
const API_PREFIX = '/api/skillbox'

/**
 * Register the skillbox host half.
 *
 * @param ctx - host plugin context.
 * @returns the skillbox face consumed by the tools.
 */
export function apply(ctx) {
  /** @type {Map<string, Skillbox>} */
  const boxes = new Map()
  /** @type {Set<(payload: object) => void>} */
  const listeners = new Set()
  /** @type {Map<string, import('node:fs').FSWatcher>} */
  const watchers = new Map()

  const log = (level, message, detail) => {
    try {
      const logger = ctx.logger
      if (logger === undefined || typeof logger[level] !== 'function') return
      if (detail === undefined) logger[level](message)
      else logger[level](`${message} — ${String(detail)}`)
    } catch {
      /* logging must never break a request */
    }
  }

  /**
   * Resolve the workspace root this plugin operates on.
   *
   * An agent-scoped call contributes its session cwd (the active workspace); a
   * browser call has no session, so the sandbox policy's `workspace-write` root
   * stands in — the same boundary the running session already uses.
   *
   * @param session - optional session whose header carries the workspace.
   * @returns an absolute workspace root.
   */
  const workspaceRootOf = (session) => {
    const fromSession = session?.header?.cwd
    if (typeof fromSession === 'string' && fromSession !== '') return resolve(fromSession)
    const fromPolicy = ctx.get('sandboxPolicy')?.workspaceRoot
    if (typeof fromPolicy === 'string' && fromPolicy !== '') return resolve(fromPolicy)
    return process.cwd()
  }

  /** Notify every connected browser that skillbox state changed. */
  const broadcast = (payload) => {
    for (const listener of [...listeners]) {
      try {
        listener(payload)
      } catch (error) {
        log('warn', 'skillbox: 事件推送失败', error?.message ?? error)
      }
    }
  }

  /**
   * Watch one skillbox folder so changes made outside the plugin (an editor, a
   * shell command, a manual delete) still reach the sidebar.
   */
  const watchBox = (box) => {
    if (watchers.has(box.dir)) return
    try {
      const pending = { timer: undefined }
      const watcher = watch(box.dir, { persistent: false }, () => {
        clearTimeout(pending.timer)
        pending.timer = setTimeout(() => {
          broadcast({ type: 'changed', root: box.root, reason: 'fs' })
        }, 150)
      })
      watcher.on('error', (error) => log('warn', 'skillbox: 目录监听中断', error?.message ?? error))
      watchers.set(box.dir, watcher)
      ctx.effect(() => async () => {
        clearTimeout(pending.timer)
        watcher.close()
        watchers.delete(box.dir)
      }, `skillbox: watch ${box.dir}`)
    } catch (error) {
      // The folder may not exist yet; the next mutation re-creates it and the
      // sidebar still refreshes on demand.
      log('debug', 'skillbox: 暂无法监听目录', error?.message ?? error)
    }
  }

  /** Get (and lazily create) the skillbox of one workspace root. */
  const boxOf = (session) => {
    const root = workspaceRootOf(session)
    let box = boxes.get(root)
    if (box === undefined) {
      box = new Skillbox(root)
      boxes.set(root, box)
      watchBox(box)
    }
    return box
  }

  /**
   * Decide whether a browser-originated write may touch a workspace.
   *
   * The desktop runs a `workspace-write` policy whose boundary is the workspace
   * root; the same root is read from the sandbox policy, so a request is admitted
   * when it names that root and refused when it names anything else.
   *
   * @param requestedRoot - root the browser believes it is operating on.
   * @returns the admitted root.
   */
  const admit = (requestedRoot) => {
    const admitted = workspaceRootOf()
    if (typeof requestedRoot === 'string' && requestedRoot !== '' && resolve(requestedRoot) !== admitted) {
      throw new Error(`skillbox: 拒绝操作工作区 ${requestedRoot}（当前工作区为 ${admitted}）`)
    }
    return admitted
  }

  /** Build the payload the sidebar renders. */
  const viewOf = async (box, extra = {}) => {
    const listed = await box.list()
    return {
      root: box.root,
      skillboxDir: box.dir,
      enabledDir: box.enabledDir,
      skills: listed.skills,
      pending: listed.pending,
      ...extra,
    }
  }

  /** The skill offered for trial, with the body the model is told to run. */
  const offerOf = async (box) => {
    const listed = await box.list()
    if (listed.pending === null) return null
    const skillName = listed.pending
    const entry = listed.skills.find((skill) => skill.name === skillName)
    if (entry === undefined) return null
    const body = await box.readBody(skillName).catch(() => undefined)
    if (body === undefined) return null
    return { ...entry, body }
  }

  /**
   * Generate a random skill, park it in the skillbox, and enable it so the next
   * conversation sees it.
   */
  const generate = async (session) => {
    const box = boxOf(session)
    await box.ensure()
    const listed = await box.list()
    const taken = listed.skills.map((skill) => skill.name)
    const generated = generateSkill({ taken })

    // A previous undecided trial stops being the pending offer: it has been seen
    // and enabled, so it is kept, and the sidebar and the decision tool address
    // one skill at a time. The skill itself is untouched.
    if (listed.pending !== null && listed.pending !== generated.name) {
      await box.patch(listed.pending, { state: 'kept' }).catch(() => undefined)
    }

    const skill = await box.add(generated, { state: 'trial', group: 'random' })
    await box.setEnabled(generated.name, true)
    const view = await viewOf(box, { created: skill.name })
    const payload = {
      ...skill,
      whenToUse: generated.whenToUse,
      body: generated.body,
      archetype: generated.archetype,
    }
    broadcast({ type: 'generated', root: box.root, skill: payload, view })
    return { skill: payload, view }
  }

  /** The RPC surface. Every method is workspace-scoped and idempotent. */
  const methods = {
    /** Report the skillbox without changing it. */
    list: async (payload, session) => viewOf(boxOf(session), { requestedRoot: payload?.root ?? null }),

    /** Generate one random skill and return its introduction. */
    kick: async (_payload, session) => generate(session),

    /** The skill awaiting the keep/delete decision, or `null`. */
    pending: async (_payload, session) => {
      const box = boxOf(session)
      return { root: box.root, offer: await offerOf(box) }
    },

    /** Enable or disable a skillbox skill (writes/removes the `.dsh/skills` copy). */
    toggle: async (payload, session) => {
      const box = boxOf(session)
      const skillName = String(payload?.name ?? '')
      const enabled = payload?.enabled === true
      const record = await box.record(skillName)
      if (record === undefined) throw new Error(`skillbox: 未登记的 skill "${skillName}"`)
      // The toggle is the "enabled in the workspace" control, so it also settles
      // the lifecycle: enabling keeps the skill, disabling parks it.
      await box.patch(skillName, { state: enabled ? 'kept' : 'disabled' })
      const result = await box.setEnabled(skillName, enabled)
      const view = await viewOf(box)
      broadcast({ type: 'toggled', root: box.root, name: skillName, enabled, view })
      return { ...result, view }
    },

    /** Record the keep/delete decision for a skill. */
    decide: async (payload, session) => {
      const box = boxOf(session)
      const skillName = String(payload?.name ?? '')
      const decision = String(payload?.decision ?? '')
      const result = await box.decide(skillName, decision)
      const view = await viewOf(box)
      broadcast({ type: 'decided', root: box.root, name: skillName, decision, view })
      return { ...result, view }
    },

    /** Delete a skill folder and its enabled copy. */
    remove: async (payload, session) => methods.decide({ ...payload, decision: 'delete' }, session),

    /** Persist a trial/kept/disabled state without touching the enabled copy. */
    state: async (payload, session) => {
      const box = boxOf(session)
      const skill = await box.patch(String(payload?.name ?? ''), { state: String(payload?.state ?? '') })
      const view = await viewOf(box)
      broadcast({ type: 'stated', root: box.root, name: skill.name, state: skill.state, view })
      return { skill, view }
    },

    /** Re-read the skillbox from disk (adopts folders dropped in externally). */
    refresh: async (_payload, session) => {
      const box = boxOf(session)
      await box.ensure()
      return viewOf(box)
    },
  }

  /** Read a JSON request body with a hard cap. */
  const readJson = async (req) => {
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > 1024 * 512) throw new Error('skillbox: 请求体过大')
      chunks.push(chunk)
    }
    if (chunks.length === 0) return {}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  }

  const sendJson = (res, status, value) => {
    res.statusCode = status
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end(JSON.stringify(value))
  }

  /** Resolve the session a browser request is about, when it names one. */
  const sessionOf = (url) => {
    const id = url.searchParams.get('sessionId')
    if (typeof id !== 'string' || id === '') return undefined
    return ctx.get('sessions')?.get(id)
  }

  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(
      () =>
        webCtx.webServer.register({
          kind: 'prefix',
          path: API_PREFIX,
          handler: async (req, res) => {
            const url = new URL(req.url ?? '/', 'http://127.0.0.1')
            const method = url.pathname.slice(API_PREFIX.length).replace(/^\//, '')
            try {
              if (method === 'events') {
                if (req.method !== 'GET') return sendJson(res, 405, { error: 'method-not-allowed' })
                res.statusCode = 200
                res.setHeader('content-type', 'text/event-stream; charset=utf-8')
                res.setHeader('cache-control', 'no-store')
                res.setHeader('connection', 'keep-alive')
                res.write(`event: hello\ndata: ${JSON.stringify({ root: workspaceRootOf(sessionOf(url)) })}\n\n`)
                const listener = (payload) => {
                  try {
                    res.write(`data: ${JSON.stringify(payload)}\n\n`)
                  } catch {
                    /* the client went away; cleanup happens on close */
                  }
                }
                listeners.add(listener)
                const keepAlive = setInterval(() => {
                  try {
                    res.write(': ping\n\n')
                  } catch {
                    /* ignore */
                  }
                }, 25000)
                const cleanup = () => {
                  clearInterval(keepAlive)
                  listeners.delete(listener)
                }
                req.on('close', cleanup)
                res.on('close', cleanup)
                return undefined
              }

              const handler = methods[method]
              if (handler === undefined) return sendJson(res, 404, { error: 'unknown-method', method })
              const payload = req.method === 'POST' ? await readJson(req) : Object.fromEntries(url.searchParams)
              if (req.method !== 'POST' && method !== 'list' && method !== 'pending' && method !== 'refresh') {
                return sendJson(res, 405, { error: 'method-not-allowed' })
              }
              admit(payload?.root)
              const value = await handler(payload, sessionOf(url))
              return sendJson(res, 200, { ok: true, ...value })
            } catch (error) {
              log('warn', 'skillbox: 请求失败', error?.message ?? error)
              return sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
            }
          },
        }),
      'skillbox: api route',
    )
  })

  const api = {
    box: () => boxOf(undefined),
    offer: async () => offerOf(boxOf(undefined)),
    generate,
    view: async () => viewOf(boxOf(undefined)),
    workspaceRoot: () => workspaceRootOf(undefined),
    methods,
  }

  registerTools(ctx, api)

  // An installation creates the skillbox in the workspace it lands in, so the
  // folder the sidebar browses exists before the first click.
  void api
    .box()
    .ensure()
    .then(() => log('info', `skillbox: 已就绪 ${api.workspaceRoot()}`))
    .catch((error) => log('warn', 'skillbox: 初始化工作区 skillbox 失败', error?.message ?? error))

  return api
}

export { generateSkill } from './generator.js'
export { Skillbox } from './store.js'
