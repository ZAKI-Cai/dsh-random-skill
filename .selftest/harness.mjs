/**
 * Local harness: runs the skillbox host half against a stub Cordis context so the
 * plugin's own logic can be exercised without a running DSH process.
 *
 * Usage: node .selftest/harness.mjs
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { apply } from '../lib/index.js'

const pluginLog = []
const report = []
const log = (...args) => pluginLog.push(args.map((value) => (typeof value === 'string' ? value : JSON.stringify(value))).join(' '))
const out = (...args) => report.push(args.map((value) => (typeof value === 'string' ? value : JSON.stringify(value))).join(' '))

let routes = []
const effects = []
const stub = {
  logger: { info: log, warn: log, error: log, debug: () => {} },
  get: (name) => {
    if (name === 'sandboxPolicy') return { workspaceRoot: ROOT }
    if (name === 'webServer') return { register: (route) => (routes.push(route), () => {}) }
    if (name === 'sessions') return { get: () => undefined }
    if (name === 'tools') return { register: (definition) => (registered.push(definition), () => {}) }
    if (name === 'systemPrompt') return { section: () => () => {} }
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
const registered = []

const ROOT = await mkdtemp(join(tmpdir(), 'skillbox-harness-'))

try {
  const api = apply(stub)
  await new Promise((resolve) => setTimeout(resolve, 50))
  out('workspaceRoot =', api.workspaceRoot())
  out('routes =', routes.map((route) => `${route.kind} ${route.path}`).join(', '))
  out('tools =', registered.map((definition) => definition.name).join(', '))

  const kick = api.methods.kick
  const created = await kick({}, undefined)
  out('generated =', created.skill.name, '|', created.skill.description)
  out('view.skills =', JSON.stringify(created.view.skills.map((skill) => [skill.name, skill.state, skill.enabled])))
  out('pending =', created.view.pending)

  const pendingTool = registered.find((definition) => definition.name === 'skillbox_pending')
  const pendingValue = await pendingTool.execute({}, {})
  out('skillbox_pending ->', pendingValue.name, '| body chars =', pendingValue.instructions.length)

  const decideTool = registered.find((definition) => definition.name === 'skillbox_decide')
  out('skillbox_decide ->', JSON.stringify(await decideTool.execute({ name: created.skill.name }, {})))

  const toggled = await api.methods.toggle({ name: created.skill.name, enabled: false }, undefined)
  out('toggle off ->', JSON.stringify(toggled.view.skills.map((skill) => [skill.name, skill.state, skill.enabled])))

  const removed = await api.methods.remove({ name: created.skill.name }, undefined)
  out('remove ->', JSON.stringify(removed.view.skills.map((skill) => [skill.name, skill.state, skill.enabled])))

  out('--- plugin log ---')
  for (const line of pluginLog) out(line)
  console.log(report.join('\n'))
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
}
