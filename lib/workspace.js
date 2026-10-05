/**
 * Workspace resolution for dsh-skillbox.
 *
 * The skillbox belongs to the workspace a Session runs in — never to the harness
 * configuration directory. This module owns that decision, the list of roots it
 * refuses, and the diagnostic that explains a choice, so the plugin entry holds no
 * policy of its own.
 *
 * @module dsh-skillbox/workspace
 */

import { resolve } from 'node:path'

import { ContractError, ERROR_CODES } from './contract.js'

/**
 * Create the resolver for one plugin instance.
 *
 * The resolver is stateful in exactly one way: it remembers the last Session
 * workspace it observed. A browser request carries no Session of its own and the
 * live store can be empty for a moment (a resumed Session, a fresh page), so that
 * memory is what keeps a skillbox attached to the workspace the user is working in.
 *
 * @param ports - injected environment, so the decision is testable without a host.
 * @param ports.sessionsOf - `() => { list(): Array<{header?: {cwd?: string, createdAt?: number}}> } | undefined`.
 * @param ports.sandboxRootOf - `() => string | undefined` — the deployment default.
 * @param ports.processCwd - `() => string`.
 * @param ports.env - environment carrying `DSH_PROFILE_DIR` / `DSH_HOME`.
 */
export function createWorkspaceResolver(ports) {
  /** Roots that are the harness's own configuration, never a project workspace. */
  const refusedRoots = () => {
    const refused = new Set()
    for (const candidate of [ports.env?.DSH_PROFILE_DIR, ports.env?.DSH_HOME]) {
      if (typeof candidate === 'string' && candidate !== '') refused.add(resolve(candidate))
    }
    return refused
  }

  /** @type {string | undefined} */
  let lastSessionRoot

  /**
   * Resolve the workspace root this plugin operates on.
   *
   * Order matters: the workspace a skill belongs to is the one its Session runs in,
   * so a Session cwd always wins, then the last observed one, then the most recently
   * created live Session. Only then does the sandbox policy's `workspace-write` root
   * apply, and never when it names the harness profile or home directory.
   *
   * @param session - optional session whose header carries the workspace.
   * @returns an absolute workspace root.
   */
  const rootOf = (session) => {
    const refused = refusedRoots()
    const accept = (candidate) => {
      if (typeof candidate !== 'string' || candidate === '') return undefined
      const absolute = resolve(candidate)
      return refused.has(absolute) ? undefined : absolute
    }

    const fromSession = accept(session?.header?.cwd)
    if (fromSession !== undefined) {
      lastSessionRoot = fromSession
      return fromSession
    }

    if (lastSessionRoot !== undefined) return lastSessionRoot

    const sessions = ports.sessionsOf?.()
    if (sessions !== undefined && typeof sessions.list === 'function') {
      let newest
      for (const live of sessions.list()) {
        const cwd = accept(live?.header?.cwd)
        if (cwd === undefined) continue
        const createdAt = live?.header?.createdAt ?? 0
        if (newest === undefined || createdAt > newest.createdAt) newest = { cwd, createdAt }
      }
      if (newest !== undefined) {
        lastSessionRoot = newest.cwd
        return newest.cwd
      }
    }

    const fromPolicy = accept(ports.sandboxRootOf?.())
    if (fromPolicy !== undefined) return fromPolicy

    const fromProcess = accept(ports.processCwd?.())
    if (fromProcess !== undefined) return fromProcess

    // Every candidate was refused (a fresh install with no Session yet): the
    // harness home is the only remaining place a skillbox can safely live.
    return resolve(ports.env?.DSH_HOME ?? ports.processCwd?.() ?? '.')
  }

  /**
   * Decide whether a browser-originated request may touch a workspace.
   *
   * A request is admitted when it names the workspace this resolver chose, and
   * refused when it names another one — or the harness profile or home directory,
   * which are never a project workspace.
   *
   * @param requestedRoot - root the browser believes it is operating on.
   * @returns the admitted root.
   * @throws {ContractError} `WORKSPACE_REFUSED` or `CONFIG_DIR_REFUSED`.
   */
  const admit = (requestedRoot) => {
    const admitted = rootOf()
    if (typeof requestedRoot !== 'string' || requestedRoot === '') return admitted
    const requested = resolve(requestedRoot)
    if (requested === admitted) return admitted
    if (refusedRoots().has(requested)) {
      throw new ContractError(ERROR_CODES.CONFIG_DIR_REFUSED, `skillbox: 拒绝操作 ${requested}：那是 DSH 配置目录，不是工作区`)
    }
    throw new ContractError(ERROR_CODES.WORKSPACE_REFUSED, `skillbox: 拒绝操作工作区 ${requested}（当前工作区为 ${admitted}）`)
  }

  /**
   * Explain how the root was chosen, so a wrong skillbox location can be diagnosed
   * from the browser half or the command line instead of guessed.
   *
   * @param session - optional session the request named.
   */
  const diagnose = (session) => {
    const sessions = ports.sessionsOf?.()
    const live = typeof sessions?.list === 'function' ? sessions.list() : []
    return {
      root: rootOf(session),
      resolvedFrom:
        session?.header?.cwd !== undefined
          ? 'request-session'
          : lastSessionRoot !== undefined
            ? 'last-observed-session'
            : live.some((entry) => typeof entry?.header?.cwd === 'string')
              ? 'live-session'
              : ports.sandboxRootOf?.() !== undefined
                ? 'sandbox-policy'
                : 'process-cwd',
      requestedSession: session?.id ?? null,
      lastObservedSessionRoot: lastSessionRoot ?? null,
      candidates: {
        sessions: live.map((entry) => ({ id: entry?.id ?? null, cwd: entry?.header?.cwd ?? null })),
        sandboxPolicy: ports.sandboxRootOf?.() ?? null,
        processCwd: ports.processCwd?.() ?? null,
      },
      refused: [...refusedRoots()],
    }
  }

  return { rootOf, admit, diagnose, refusedRoots, lastObservedRoot: () => lastSessionRoot }
}
