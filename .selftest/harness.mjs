/**
 * Local harness: runs the skillbox host half against a stub Cordis context and a
 * real HTTP server, so the whole request path — route, auth fence, JSON envelope,
 * argument parsing, workspace-root resolution — is exercised without a running
 * DSH process.
 *
 * Usage: node .selftest/harness.mjs
 */

import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { apply } from '../lib/index.js'

const pluginLog = []
const report = []
const log = (...args) => pluginLog.push(args.map(stringify).join(' '))
const out = (...args) => report.push(args.map(stringify).join(' '))
function stringify(value) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

/** Workspace root this run pretends to be the user's project. */
const ROOT = await mkdtemp(join(tmpdir(), 'skillbox-harness-'))

const routes = []
const registered = []
const effects = []

const stub = {
  logger: { info: log, warn: log, error: log, debug: () => {} },
  get: (name) => {
    if (name === 'sandboxPolicy') return { workspaceRoot: ROOT }
    if (name === 'webServer') return { register: (route) => (routes.push(route), () => {}) }
    if (name === 'sessions') return { get: () => undefined, list: () => [] }
    if (name === 'tools') return { register: (definition) => (registered.push(definition), () => {}) }
    if (name === 'systemPrompt') return { section: () => () => {} }
    if (name === 'connection') {
      // The real fence rejects unauthenticated requests; this stub accepts only a
      // request carrying the header the harness sends.
      return { admit: (req) => (req.headers['x-harness-auth'] === 'yes' ? { peer: {} } : { rejection: 401 }) }
    }
    return undefined
  },
  inject: (deps, callback) => {
    const child = { ...stub, webServer: stub.get('webServer') }
    child.get = stub.get
    child.inject = stub.inject
    child.effect = stub.effect
    child.logger = stub.logger
    callback(child)
  },
  effect: (execute, label) => {
    const disposer = execute()
    effects.push({ disposer, label })
    return () => {}
  },
}

let port = 0

/** Minimal request helper against the harness server. */
async function request(method, path, body, headers = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-harness-auth': 'yes', ...headers },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  })
  const text = await response.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = undefined
  }
  return { status: response.status, text, json }
}

let server
try {
  const api = apply(stub)
  await new Promise((resolve) => setTimeout(resolve, 50))

  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const route = routes
      .filter((entry) => url.pathname.startsWith(entry.path))
      .sort((left, right) => right.path.length - left.path.length)[0]
    if (route === undefined) {
      res.statusCode = 404
      res.end('not found')
      return
    }
    route.handler(req, res)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = server.address().port

  out(`workspaceRoot = ${api.workspaceRoot()}`)
  out(`expected root = ${ROOT}`)
  out(`routes = ${routes.map((route) => `${route.kind} ${route.path}`).join(', ')}`)
  out(`tools = ${registered.map((definition) => definition.name).join(', ')}`)

  // The fence must reject before any state changes.
  const denied = await request('POST', '/api/skillbox/list', {}, { 'x-harness-auth': 'no' })
  out(`unauthenticated list -> ${denied.status} ${JSON.stringify(denied.text)}`)

  const missing = await request('POST', '/api/skillbox/nope', {})
  out(`unknown method -> ${missing.status} ${JSON.stringify(missing.json)}`)

  const diagnose = await request('POST', '/api/skillbox/diagnose', {})
  out(`diagnose -> ${JSON.stringify(diagnose.json)}`)

  const info = await request('POST', '/api/skillbox/info', {})
  out(`info -> ${info.status} apiVersion=${info.json?.apiVersion} methods=${info.json?.methods?.length} combos=${info.json?.catalogue?.combinations}`)

  // Every failure must carry a stable code, not only a message.
  const badJson = await fetch(`http://127.0.0.1:${port}/api/skillbox/list`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-harness-auth': 'yes' },
    body: '{not json',
  })
  out(`malformed body -> ${badJson.status} ${JSON.stringify(await badJson.json())}`)

  const unknownSkill = await request('POST', '/api/skillbox/replay', { name: 'does-not-exist' })
  out(`replay unknown skill -> ${unknownSkill.status} code=${unknownSkill.json?.code}`)

  const catalogue = await request('POST', '/api/skillbox/catalogue', {})
  out(
    `catalogue -> ${catalogue.status} domains=${catalogue.json?.domains?.length} families=${catalogue.json?.families} combinations=${catalogue.json?.combinations} minChars=${catalogue.json?.minDocumentChars}`,
  )
  out(`catalogue domains = ${(catalogue.json?.domains ?? []).map((domain) => `${domain.label}(${domain.families.length})`).join(', ')}`)
  out(`catalogue window = ${JSON.stringify(catalogue.json?.window)}`)

  const kick = await request('POST', '/api/skillbox/kick', {})
  const skillName = kick.json?.skill?.name
  out(`kick -> ${kick.status} name=${skillName}`)
  out(`kick description = ${kick.json?.skill?.description}`)
  out(`kick topic = ${JSON.stringify(kick.json?.skill?.topic)}`)
  out(`kick characters = ${kick.json?.skill?.characters} valid=${kick.json?.skill?.validation?.ok}`)
  out(`kick window = ${JSON.stringify(kick.json?.window)}`)
  out(`kick view.skills = ${JSON.stringify(kick.json?.view?.skills?.map((skill) => [skill.name, skill.state, skill.enabled]))}`)

  const list = await request('POST', '/api/skillbox/list', {})
  out(`list -> ${list.status} root=${list.json?.root} pending=${list.json?.pending}`)

  const pending = await request('POST', '/api/skillbox/pending', {})
  out(
    `pending -> ${pending.status} name=${pending.json?.offer?.name} domain=${pending.json?.offer?.domainLabel} chars=${pending.json?.offer?.characters} bodyChars=${pending.json?.offer?.body?.length}`,
  )
  out(`pending seed = ${pending.json?.offer?.seed}`)

  // Determinism: the recorded seed must re-derive the document byte for byte.
  const replay = await request('POST', '/api/skillbox/replay', { name: skillName })
  out(
    `replay -> ${replay.status} seed=${replay.json?.seed} reproducible=${replay.json?.reproducible} replayedName=${replay.json?.replayedName}`,
  )
  if (replay.json?.reproducible !== true) {
    throw new Error(`replay of ${skillName} was not reproducible: ${JSON.stringify(replay.json?.differences)}`)
  }

  // The same seed twice must produce identical bytes through the generator itself.
  const generator = await import('../lib/generator.js')
  const first = generator.generateSkill({ seed: 123456, taken: [] })
  const second = generator.generateSkill({ seed: 123456, taken: [] })
  out(`seeded determinism -> ${first.body === second.body && first.name === second.name}`)
  if (first.body !== second.body) throw new Error('the same seed produced two different documents')

  // Narrowing a draw, and the metadata that survives a round trip through disk.
  const narrowed = await request('POST', '/api/skillbox/kick', { topic: { domainId: 'bio' } })
  out(
    `kick(domainId=bio) -> ${narrowed.status} name=${narrowed.json?.skill?.name} domain=${narrowed.json?.skill?.domainLabel}`,
  )
  const afterNarrow = await request('POST', '/api/skillbox/list', {})
  out(`after narrowed kick -> pending=${afterNarrow.json?.pending} skills=${JSON.stringify(afterNarrow.json?.skills?.map((skill) => [skill.name, skill.state]))}`)
  const removedNarrow = await request('POST', '/api/skillbox/remove', { name: narrowed.json?.skill?.name })
  out(`remove narrowed -> pending=${removedNarrow.json?.view?.pending} skills=${JSON.stringify(removedNarrow.json?.view?.skills?.map((skill) => [skill.name, skill.state]))}`)

  const toggled = await request('POST', '/api/skillbox/toggle', { name: skillName, enabled: false })
  out(`toggle off -> ${toggled.status} ${JSON.stringify(toggled.json?.view?.skills?.map((skill) => [skill.name, skill.state, skill.enabled]))}`)

  const kept = await request('POST', '/api/skillbox/decide', { name: skillName, decision: 'keep' })
  out(`keep -> ${kept.status} ${JSON.stringify(kept.json?.view?.skills?.map((skill) => [skill.name, skill.state, skill.enabled]))}`)

  const removed = await request('POST', '/api/skillbox/remove', { name: skillName })
  out(`remove -> ${removed.status} ${JSON.stringify(removed.json?.view?.skills)}`)

  const badRoot = await request('POST', '/api/skillbox/list', { root: 'C:/somewhere/else' })
  out(`cross-workspace list -> ${badRoot.status} ${JSON.stringify(badRoot.json?.error)}`)

  const refusedRoot = await request('POST', '/api/skillbox/list', { root: process.env.DSH_PROFILE_DIR ?? 'C:/none' })
  out(`refused-root list -> ${refusedRoot.status} ${JSON.stringify(refusedRoot.json?.error)}`)

  const pendingTool = registered.find((definition) => definition.name === 'skillbox_pending')
  const pendingValue = await pendingTool.execute({}, {})
  out(`skillbox_pending -> name=${pendingValue.name === '' ? '(none)' : pendingValue.name}`)

  const generated = await api.generate()
  const decideTool = registered.find((definition) => definition.name === 'skillbox_decide')
  out(`skillbox_decide -> ${JSON.stringify(await decideTool.execute({ name: generated.skill.name }, {}))}`)

  out('--- plugin log ---')
  for (const line of pluginLog) out(line)
  console.log(report.join('\n'))

  await new Promise((resolve) => server.close(resolve))
} catch (error) {
  console.error('HARNESS FAILED:', error)
  process.exitCode = 1
} finally {
  for (const { disposer, label } of effects.reverse()) {
    try {
      if (typeof disposer === 'function') await disposer()
      else if (disposer !== undefined && typeof disposer[Symbol.asyncDispose] === 'function') await disposer[Symbol.asyncDispose]()
    } catch (error) {
      console.error('dispose failed', label, error)
    }
  }
  await rm(ROOT, { recursive: true, force: true })
  // A failed assertion must not leave the harness hanging on an open socket.
  if (server !== undefined) {
    server.closeAllConnections?.()
    await new Promise((resolve) => server.close(resolve))
  }
  process.exit(process.exitCode ?? 0)
}
