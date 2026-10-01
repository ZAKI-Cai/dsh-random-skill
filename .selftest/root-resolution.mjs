/**
 * Regression check for the workspace-root resolution.
 *
 * The desktop deployment's sandbox `workspaceRoot` names the harness profile
 * directory, while the user's project lives in a Session cwd. This run pins that
 * shape and asserts the plugin picks the Session workspace.
 *
 * Usage: node .selftest/root-resolution.mjs
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { apply } from '../lib/index.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(`assertion failed: ${message}`)
  console.log(`ok   ${message}`)
}

const PROJECT = await mkdtemp(join(tmpdir(), 'skillbox-project-'))
const PROFILE = resolve(process.env.DSH_PROFILE_DIR ?? join(tmpdir(), 'skillbox-profile'))
const registered = []

const makeStub = (sessions) => {
  const stub = {
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    get: (name) => {
      if (name === 'sandboxPolicy') return { workspaceRoot: PROFILE }
      if (name === 'webServer') return { register: () => () => {} }
      if (name === 'sessions') return { get: () => undefined, list: () => sessions }
      if (name === 'tools') return { register: (definition) => (registered.push(definition), () => {}) }
      if (name === 'systemPrompt') return { section: () => () => {} }
      return undefined
    },
    inject: (_deps, callback) => callback(stub),
    effect: () => () => {},
  }
  return stub
}

// 1. The live Session decides, even though the deployment default is the profile.
const sessionOne = { id: 'session-one', header: { cwd: PROJECT, createdAt: 1 } }
const api = apply(makeStub([sessionOne]))
assert(api.workspaceRoot() === PROJECT, `live Session cwd wins over the sandbox default (${PROJECT})`)
assert(!api.workspaceRoot().includes('.dsh'), 'the profile directory is never chosen as the workspace')

// 2. With no live Session, the deployment default is not adopted when it names the
//    harness profile; the process cwd stands in.
const emptyApi = apply(makeStub([]))
assert(emptyApi.workspaceRoot() !== PROFILE, 'a refused profile root is never adopted')
assert(
  emptyApi.workspaceRoot() === resolve(process.cwd()) || emptyApi.workspaceRoot() === resolve(process.env.DSH_HOME ?? process.cwd()),
  'the process cwd (or the harness home as a last resort) stands in',
)

// 3. A workspace observed through an agent-scoped call is remembered, so a later
//    browser request (which carries no Session) still resolves to it.
const rememberedApi = apply(makeStub([]))
assert(rememberedApi.workspaceRoot() !== PROJECT, 'before the first call the project is unknown')
await rememberedApi.generate({ header: { cwd: PROJECT } })
assert(rememberedApi.workspaceRoot() === PROJECT, 'an agent-scoped call teaches the plugin the Session workspace')

await rm(PROJECT, { recursive: true, force: true })
console.log('\nroot-resolution: all assertions passed')
