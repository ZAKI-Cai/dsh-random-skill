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

// 4. The generator's contract: every draw is structurally complete, and the whole
//    catalogue is reachable. This is what keeps "the document must be specific
//    enough" from regressing as families are added.
const generator = await import('../lib/generator.js')
const catalogue = generator.catalogue()
assert(catalogue.length >= 16, `at least 16 domains are catalogued (${catalogue.length})`)
assert(generator.families().length >= 70, `at least 70 task families are catalogued (${generator.families().length})`)
assert(generator.combinationCount() >= 200, `at least 200 family×recipe combinations (${generator.combinationCount()})`)

const seenDomains = new Set()
const taken = new Set()
let shortest = Infinity
for (let index = 0; index < 400; index += 1) {
  const skill = generator.generateSkill({ taken: [...taken] })
  taken.add(skill.name)
  seenDomains.add(skill.domain)
  shortest = Math.min(shortest, skill.characters)
  if (!skill.validation.ok) throw new Error(`draw ${skill.name} failed validation: ${skill.validation.problems.join('; ')}`)
}
assert(seenDomains.size === catalogue.length, `400 draws reach every domain (${seenDomains.size}/${catalogue.length})`)
assert(shortest >= generator.MIN_DOCUMENT_CHARS, `every draw meets the minimum document size (shortest ${shortest})`)

// 4b. Every task family, on every recipe it offers, must produce a valid document.
//     A random sample does not cover this: one mistyped field in one family would
//     only surface once in a few thousand draws. Walking the whole catalogue is what
//     makes "just add a family" safe — and it is the check that caught nothing here
//     only because the data was written carefully, which is exactly the point.
let familyChecks = 0
for (const { domainId, family } of generator.families()) {
  for (const recipe of family.recipes) {
    const skill = generator.generateSkill({ seed: 7, domainId, familyId: family.id, recipes: [recipe], taken: [] })
    familyChecks += 1
    if (!skill.validation.ok) {
      throw new Error(`${domainId}/${family.id}/${recipe} produced an invalid document: ${skill.validation.problems.join('; ')}`)
    }
    for (const field of ['name', 'description', 'whenToUse', 'body', 'domain', 'family', 'recipe', 'topic']) {
      if (skill[field] === undefined || skill[field] === null || skill[field] === '') {
        throw new Error(`${domainId}/${family.id}/${recipe} left "${field}" empty`)
      }
    }
    if (skill.characters < generator.MIN_DOCUMENT_CHARS) {
      throw new Error(`${domainId}/${family.id}/${recipe} is too short (${skill.characters})`)
    }
    if (/\{[a-zA-Z]+\}/.test(skill.body)) {
      throw new Error(`${domainId}/${family.id}/${recipe} left a template placeholder`)
    }
  }
}
assert(familyChecks >= 200, `every domain/family/recipe triple produces a valid document (${familyChecks} documents)`)

// 5. Replay determinism: the same seed with the same pinned topic must reproduce
//    the exact document, including its name. This is what the sidebar's "重放校验"
//    button and a bug report quoting a seed both rely on.
const pinned = { seed: 424242, domainId: 'bio', familyId: 'species-identification', recipes: ['analyze'], taken: [] }
const replayA = generator.generateSkill(pinned)
const replayB = generator.generateSkill(pinned)
assert(replayA.name === replayB.name, `replay reproduces the name (${replayA.name})`)
assert(replayA.body === replayB.body, 'replay reproduces the document byte for byte')
assert(replayA.seed === 424242, 'the seed is reported back unchanged')

// 6. A different seed must produce a different document, or the seed is doing no work.
const other = generator.generateSkill({ ...pinned, seed: 424243 })
assert(other.body !== replayA.body, 'a different seed produces a different document')

// 7. An unimplemented narrowing is a coded contract failure, not a bare Error.
const { ContractError, ERROR_CODES } = await import('../lib/contract.js')
try {
  generator.generateSkill({ domainId: 'no-such-domain' })
  throw new Error('expected a ContractError for an unknown domain')
} catch (error) {
  assert(error instanceof ContractError, 'an unknown domain raises a ContractError')
  assert(error.code === ERROR_CODES.NO_MATCHING_TOPIC, `the failure carries code ${ERROR_CODES.NO_MATCHING_TOPIC}`)
}

await rm(PROJECT, { recursive: true, force: true })
console.log('\nroot-resolution: all assertions passed')
