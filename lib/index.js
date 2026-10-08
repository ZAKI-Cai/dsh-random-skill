/**
 * dsh-skillbox — host half.
 *
 * Owns the workspace-local `skillbox` folder, the random skill generator, the
 * trial/keep/delete lifecycle, and the small HTTP face the browser half calls.
 * The browser half (`./client`) draws the generation button and the right-edge
 * sidebar; this half is the single writer of skillbox state.
 *
 * This entry composes four collaborators and owns none of their internals:
 *
 * | Module | Responsibility |
 * |---|---|
 * | `workspace.js` | which workspace root a request belongs to |
 * | `store.js` | the skillbox folder, its metadata, and atomic mutations |
 * | `generator.js` | turning a seed into a document |
 * | `routes.js` | the HTTP face: fence, envelope, status codes, SSE |
 *
 * @module dsh-skillbox
 */

import { watch } from 'node:fs'

import { API_PREFIX, API_VERSION, CLIENT_METHODS, ContractError, ERROR_CODES, MAX_REQUEST_BYTES, METHODS } from './contract.js'
import { AUTHORING_WINDOW, DEPTHS, MIN_DOCUMENT_CHARS, catalogue, combinationCount, families, generateSkill } from './generator.js'
import { RECIPES } from './recipes.js'
import { createRouteHandler } from './routes.js'
import { Skillbox } from './store.js'
import { registerTools } from './tools.js'
import { createWorkspaceResolver } from './workspace.js'

/** Cordis plugin name. */
export const name = 'skillbox'

/**
 * No hard service dependency: every capability is read through `ctx.get(name)`
 * and degrades to a no-op when a composition mounts this plugin without it.
 */
export const inject = []

/**
 * Register the skillbox host half.
 *
 * @param ctx - host plugin context.
 * @returns the skillbox face consumed by the tools and by the self-tests.
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

  const workspace = createWorkspaceResolver({
    sessionsOf: () => ctx.get('sessions'),
    sandboxRootOf: () => ctx.get('sandboxPolicy')?.workspaceRoot,
    processCwd: () => process.cwd(),
    env: process.env,
  })

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
    const root = workspace.rootOf(session)
    let box = boxes.get(root)
    if (box === undefined) {
      box = new Skillbox(root)
      boxes.set(root, box)
      watchBox(box)
    }
    return box
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
    const record = (await box.record(skillName)) ?? {}
    return {
      ...entry,
      body,
      seed: record.seed ?? null,
      domain: record.domain ?? null,
      domainLabel: record.domainLabel ?? null,
      family: record.family ?? null,
      familySubject: record.familySubject ?? null,
      recipe: record.recipe ?? null,
      recipeLabel: record.recipeLabel ?? null,
      scope: record.scope ?? null,
      audience: record.audience ?? null,
      deliverable: record.deliverable ?? null,
      depth: record.depth ?? null,
      depthLabel: record.depthLabel ?? null,
      characters: body.length,
      registeredAt: record.createdAt ?? null,
      window: record.window ?? AUTHORING_WINDOW,
    }
  }

  /**
   * Generate one random skill, park it in the skillbox, and enable it so the next
   * conversation sees it.
   *
   * The generation itself is local and immediate; the *reported* window is the one
   * the user asked for — a topic-selection window and an authoring window — so the
   * browser half can present the work honestly and the model knows how long it may
   * spend writing when it takes the trial over.
   *
   * @param session - optional session whose workspace owns the skillbox.
   * @param options - `{ domainId, familyId, depth, seed }` to steer or replay the draw.
   */
  const generate = async (session, options = {}) => {
    const box = boxOf(session)
    await box.ensure()
    const listed = await box.list()
    const taken = listed.skills.map((skill) => skill.name)
    const startedAt = Date.now()
    const generated = generateSkill({
      taken,
      domainId: options.domainId,
      familyId: options.familyId,
      depth: options.depth,
      seed: options.seed,
    })
    const composedAt = Date.now()

    // A previous undecided trial stops being the pending offer: it has been seen
    // and enabled, so it is kept, and the sidebar and the decision tool address
    // one skill at a time. The skill itself is untouched.
    if (listed.pending !== null && listed.pending !== generated.name) {
      await box.patch(listed.pending, { state: 'kept' }).catch(() => undefined)
    }

    const skill = await box.add(generated, {
      state: 'trial',
      group: 'random',
      seed: generated.seed,
      domain: generated.domain,
      domainLabel: generated.domainLabel,
      family: generated.family,
      familySubject: generated.familySubject,
      recipe: generated.recipe,
      recipeLabel: generated.recipeLabel,
      scope: generated.scope,
      audience: generated.audience,
      deliverable: generated.deliverable,
      style: generated.style,
      depth: generated.depth,
      depthLabel: generated.depthLabel,
      window: generated.window,
    })
    await box.setEnabled(generated.name, true)
    const view = await viewOf(box, { created: skill.name })
    const payload = {
      ...skill,
      whenToUse: generated.whenToUse,
      body: generated.body,
      seed: generated.seed,
      domain: generated.domain,
      domainLabel: generated.domainLabel,
      family: generated.family,
      familySubject: generated.familySubject,
      recipe: generated.recipe,
      recipeLabel: generated.recipeLabel,
      scope: generated.scope,
      audience: generated.audience,
      deliverable: generated.deliverable,
      style: generated.style,
      depth: generated.depth,
      depthLabel: generated.depthLabel,
      hasExample: generated.hasExample,
      characters: generated.characters,
      registeredAt: generated.registeredAt,
      validation: generated.validation,
      topic: generated.topic,
      window: generated.window,
    }
    broadcast({ type: 'generated', root: box.root, skill: payload, view })
    return {
      skill: payload,
      view,
      composition: { composeMs: composedAt - startedAt, totalMs: Date.now() - startedAt },
      window: generated.window,
    }
  }

  /** The RPC surface. Every method is workspace-scoped and idempotent. */
  const methods = {
    /** Report what this host half serves, so the browser can detect drift. */
    info: async () => ({
      apiVersion: API_VERSION,
      methods: CLIENT_METHODS,
      readMethods: CLIENT_METHODS.filter((method) => METHODS[method]?.read === true),
      maxRequestBytes: MAX_REQUEST_BYTES,
      catalogue: { domains: catalogue().length, families: families().length, combinations: combinationCount() },
      window: AUTHORING_WINDOW,
      minDocumentChars: MIN_DOCUMENT_CHARS,
    }),

    /** Report the skillbox without changing it. */
    list: async (payload, session) => viewOf(boxOf(session), { requestedRoot: payload?.root ?? null }),

    /** The generation catalogue: domains, task families, recipes, depths and counts. */
    catalogue: async () => ({
      domains: catalogue(),
      recipes: RECIPES.map((recipe) => ({ id: recipe.id, label: recipe.label, steps: recipe.steps.length })),
      depths: DEPTHS,
      families: families().length,
      combinations: combinationCount(),
      window: AUTHORING_WINDOW,
      minDocumentChars: MIN_DOCUMENT_CHARS,
    }),

    /** The skill awaiting the keep/delete decision, or `null`. */
    pending: async (_payload, session) => {
      const box = boxOf(session)
      return { root: box.root, offer: await offerOf(box) }
    },

    /**
     * Generate one random skill and return its introduction.
     *
     * `payload.topic` may name a `domainId` and/or `familyId` to narrow the draw;
     * `payload.seed` reproduces an earlier draw exactly.
     */
    kick: async (payload, session) =>
      generate(session, {
        domainId: payload?.topic?.domainId,
        familyId: payload?.topic?.familyId,
        depth: payload?.depth,
        seed: typeof payload?.seed === 'number' ? payload.seed : undefined,
      }),

    /**
     * Reproduce a seed and report whether the document still matches what is on
     * disk, so a skill can be re-derived (or proven unreproducible) after the
     * catalogue changes.
     */
    replay: async (payload, session) => {
      const skillName = String(payload?.name ?? '')
      const box = boxOf(session)
      const record = await box.record(skillName)
      if (record === undefined) {
        throw new ContractError(ERROR_CODES.UNKNOWN_SKILL, `skillbox: 未登记的 skill "${skillName}"`)
      }
      const seed = typeof payload?.seed === 'number' ? payload.seed : record.seed
      if (typeof seed !== 'number') {
        throw new ContractError(ERROR_CODES.UNKNOWN_SKILL, `skillbox: skill "${skillName}" 没有记录种子`)
      }
      // Pinning domain + family + recipe + depth keeps the candidate pool independent
      // of which names happen to be taken, so the seed alone decides the document.
      const replayed = generateSkill({
        seed,
        domainId: record.domain,
        familyId: record.family,
        recipes: record.recipe === undefined || record.recipe === null ? undefined : [record.recipe],
        depth: record.depth,
        taken: [],
      })
      const stored = await box.readBody(skillName).catch(() => undefined)
      return {
        name: skillName,
        seed,
        replayedName: replayed.name,
        domainLabel: replayed.domainLabel,
        characters: replayed.characters,
        reproducible: replayed.body === stored,
        body: replayed.body,
        differences:
          replayed.body === stored
            ? []
            : [
                '正文与磁盘文件不一致：生成器目录可能在该 skill 生成后被修改',
                `名称：磁盘 ${skillName} / 重放 ${replayed.name}`,
                `长度：磁盘 ${stored?.length ?? 0} / 重放 ${replayed.characters}`,
              ],
      }
    },

    /** Enable or disable a skillbox skill (writes/removes the `.dsh/skills` copy). */
    toggle: async (payload, session) => {
      const box = boxOf(session)
      const skillName = String(payload?.name ?? '')
      const enabled = payload?.enabled === true
      const record = await box.record(skillName)
      if (record === undefined) {
        throw new ContractError(ERROR_CODES.UNKNOWN_SKILL, `skillbox: 未登记的 skill "${skillName}"`)
      }
      // The toggle is the "enabled in the workspace" control, so it also settles
      // the lifecycle: enabling keeps the skill, disabling parks it.
      await box.setEnabled(skillName, enabled)
      await box.patch(skillName, { state: enabled ? 'kept' : 'disabled' })
      const view = await viewOf(box)
      broadcast({ type: 'toggled', root: box.root, name: skillName, enabled, view })
      return { name: skillName, enabled, view }
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

    /**
     * Explain how the workspace root was chosen, so a wrong skillbox location can
     * be diagnosed from the browser half or the command line instead of guessed.
     */
    diagnose: async (_payload, session) => workspace.diagnose(session),
  }

  ctx.inject(['webServer'], (webCtx) => {
    const handler = createRouteHandler({
      ctx,
      methods,
      listeners,
      log,
      workspaceRootOf: (session) => workspace.rootOf(session),
      sessionOf: (url) => {
        const id = url.searchParams.get('sessionId')
        if (typeof id !== 'string' || id === '') return undefined
        return ctx.get('sessions')?.get(id)
      },
      admit: (requestedRoot) => workspace.admit(requestedRoot),
    })
    webCtx.effect(
      () => webCtx.webServer.register({ kind: 'prefix', path: API_PREFIX, handler }),
      'skillbox: api route',
    )
  })

  const api = {
    box: () => boxOf(undefined),
    offer: async () => offerOf(boxOf(undefined)),
    generate,
    view: async () => viewOf(boxOf(undefined)),
    workspaceRoot: () => workspace.rootOf(undefined),
    workspace,
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

export { AUTHORING_WINDOW, MIN_DOCUMENT_CHARS, catalogue, combinationCount, families, generateSkill, seededRandom, validateSkill } from './generator.js'
export { API_PREFIX, API_VERSION, ContractError, ERROR_CODES, METHODS, CLIENT_METHODS } from './contract.js'
export { Skillbox } from './store.js'
export { createWorkspaceResolver } from './workspace.js'
export { createRouteHandler } from './routes.js'
export { TOOL_DECIDE, TOOL_PENDING, PENDING_OUTPUT_SCHEMA, DECIDE_OUTPUT_SCHEMA } from './tool-contract.js'
