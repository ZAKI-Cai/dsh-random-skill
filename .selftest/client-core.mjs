/**
 * Browser-core test.
 *
 * The browser half's non-React logic is now a testable unit. This suite evaluates
 * `lib/client-core.js` the way the browser does (classic script, no imports),
 * injects a fake `fetch` and a fake clock, and drives the paths that a browser-only
 * test could not reach deterministically.
 *
 * Usage: node .selftest/client-core.mjs
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const coreSource = readFileSync(join(root, 'lib', 'client-core.js'), 'utf8')
const clientSource = readFileSync(join(root, 'lib', 'client.js'), 'utf8')

const failures = []
const check = (condition, message) => {
  if (condition) console.log(`ok   ${message}`)
  else {
    failures.push(message)
    console.log(`FAIL ${message}`)
  }
}

/** Evaluate the core the way a browser loads it: classic script, `module` absent. */
function loadCore() {
  const scope = {}
  const run = new Function('globalThis', 'module', 'exports', `${coreSource}\n;return globalThis.__dshSkillboxCore`)
  return run(scope, undefined, undefined)
}

const coreFactory = loadCore()
check(typeof coreFactory === 'function', 'client-core.js installs a factory on the global')

// --- a fake host -------------------------------------------------------------

/** Build a fake fetch that records calls and replays canned envelopes. */
function makeFetch(routes) {
  const calls = []
  const impl = async (url, init) => {
    const method = String(url).split('/').pop().split('?')[0]
    const body = init?.body === undefined ? undefined : JSON.parse(init.body)
    calls.push({ url: String(url), method, body })
    const handler = routes[method]
    if (handler === undefined) return { status: 404, json: async () => ({ ok: false, apiVersion: 1, code: 'unknown-method', error: 'nope' }) }
    return { status: 200, json: async () => ({ ok: true, apiVersion: 1, ...handler(body) }) }
  }
  return { impl, calls }
}

const skillsView = (skills = []) => ({ root: 'C:/ws', skillboxDir: 'C:/ws/skillbox', enabledDir: 'C:/ws/.dsh/skills', skills, pending: null })

// --- 1. Calls address the contract prefix and carry the session --------------

{
  const { impl, calls } = makeFetch({ info: () => ({ apiVersion: 1, methods: ['info', 'list'] }) })
  const core = coreFactory({ fetch: impl })
  await core.api.load()
  await Promise.resolve()
  const urls = calls.map((entry) => entry.url)
  check(urls.every((url) => url.startsWith('/api/skillbox/')), 'every call addresses the contract prefix')
  core.api.bindSession('session-123')
  await core.api.load()
  check(calls.at(-1).url.includes('?sessionId=session-123'), 'a bound session travels as a query parameter')
}

// --- 2. Failures are typed, coded, and localized ----------------------------

{
  const core = coreFactory({ fetch: async () => ({ status: 400, json: async () => ({ ok: false, apiVersion: 1, code: 'workspace-refused', error: '跨工作区' }) }) })
  // A panel action must never throw at a React render site: it records the failure.
  let threw = false
  try {
    await core.api.load()
  } catch {
    threw = true
  }
  check(threw === false, 'load() reports through the store instead of throwing')
  const state = core.store.get()
  check(typeof state.error === 'string' && state.error.includes('别的工作区'), `the store surfaces localized copy (${state.error})`)
  check(state.ready === true, 'the store reports that the first read finished')
}

{
  const core = coreFactory({ fetch: async () => ({ status: 200, json: async () => ({ ok: true, apiVersion: 99 }) }) })
  let caught
  try {
    await core.call('info', {})
  } catch (error) {
    caught = error
  }
  check(caught !== undefined && caught.code === 'internal', 'a version mismatch is a typed failure')
  check(String(caught.message).includes('契约版本'), 'the version mismatch explains itself')
}

{
  const core = coreFactory({ fetch: async () => ({ status: 200, json: async () => ({ ok: true, apiVersion: 1 }) }) })
  let caught
  try {
    await core.call('not-a-method', {})
  } catch (error) {
    caught = error
  }
  check(caught?.code === 'unknown-method', 'a method outside the contract never reaches the network')
}

// --- 3. The authoring window is a deterministic state machine ---------------

{
  let clock = 1_000_000
  const timers = []
  const { impl } = makeFetch({
    kick: () => ({
      skill: { name: 'bio-analyze-kit-1234', topic: { domain: '生物类' }, characters: 2500, validation: { ok: true } },
      view: skillsView([{ name: 'bio-analyze-kit-1234', state: 'trial', enabled: true }]),
      window: { selectMinMs: 5000, selectMaxMs: 10000 },
    }),
  })
  const core = coreFactory({
    fetch: impl,
    now: () => clock,
    random: () => 0.5, // pins topicMs at the midpoint: 5000 + 0.5 * 5000 = 7500
    interval: (callback) => {
      timers.push(callback)
      return timers.length
    },
    clearInterval: () => {},
  })

  const phases = []
  await core.api.generate()
  check(core.store.get().progress.phase === 'select', 'a generation starts in the topic-selection phase')
  check(core.store.get().progress.topicMs === 7500, `the topic window is drawn from the host window (${core.store.get().progress.topicMs}ms)`)
  check(core.store.get().offer?.state === 'trial', 'the offer is staged as a trial')

  core.api.startAuthoringClock((phase) => phases.push(phase))
  for (const tick of timers) tick()
  check(core.store.get().progress.phase === 'select', 'the clock does not advance before the window elapses')

  clock += 8000
  for (const tick of timers) tick()
  check(core.store.get().progress.phase === 'author', 'the clock advances to authoring once the window elapses')
  check(phases.join(',') === 'author', 'the phase change is announced once')

  // A second generate() while the window is open must be refused, not queued.
  const second = await core.api.generate()
  check(second === null, 'a generation requested during the window is ignored')
}

// --- 4. cancelGeneration deletes the just-written skill ---------------------

{
  const { impl, calls } = makeFetch({
    kick: () => ({ skill: { name: 'geo-verify-kit-7777' }, view: skillsView([{ name: 'geo-verify-kit-7777', state: 'trial', enabled: true }]) }),
    remove: (body) => ({ removed: body.name, view: skillsView([]) }),
  })
  const core = coreFactory({ fetch: impl, interval: () => 1, clearInterval: () => {} })
  await core.api.generate()
  await core.api.cancelGeneration()
  check(calls.some((entry) => entry.method === 'remove' && entry.body.name === 'geo-verify-kit-7777'), 'cancelling removes the generated skill')
  check(core.store.get().progress === null, 'cancelling closes the authoring window')
  check(core.store.get().offer === null, 'cancelling drops the offer')
}

// --- 5. The client bundle delegates to the core and mirrors nothing ----------

check(clientSource.includes('createClientCore({'), 'client.js builds the core inline')
check(
  !/globalThis\.__dshSkillboxCore\s*=/.test(clientSource),
  'client.js no longer publishes or reads a separately loaded core script',
)
check(clientSource.includes('var CONTRACT = {'), 'the contract table is inlined into the shipped bundle')
check(!/class HostError/.test(clientSource), 'the inline core carries the failure class (no second copy)')
check(/Object\.assign\(\{\}, api/.test(clientSource), 'client.js exposes one facade over snapshot and actions')

// The shipped bundle must be self-contained: no separately loaded script, no
// undeclared global, and its own exports intact after the core is spliced in.
{
  let registered = null
  const reactStub = { createElement: () => null, useState: (value) => [value, () => {}], useEffect: () => {}, useRef: () => ({ current: null }) }
  const requireStub = (name) => {
    if (name === 'react') return reactStub
    throw new Error(`unexpected require ${name}`)
  }
  new Function('window', 'require', clientSource)({ __ModuleLoader__: { load: (config) => { registered = config } } }, requireStub)
  check(registered !== null && registered.id === 'dsh-skillbox', 'the bundle registers under the plugin id')
  const bundle = registered.factory(requireStub)
  check(typeof bundle.apply === 'function', 'the bundle exports apply')
  check(
    Array.isArray(bundle.inject) && bundle.inject.includes('slots'),
    `the bundle exports its service inject list (${JSON.stringify(bundle.inject)})`,
  )
}

// --- 6. Every host call the bundle makes is inside the contract -------------

const contract = readFileSync(join(root, 'lib', 'contract.js'), 'utf8')
const methodList = /export const CLIENT_METHODS = \[([\s\S]*?)\]/.exec(contract)[1]
const hostMethods = new Set([...methodList.matchAll(/'([a-z]+)'/g)].map((match) => match[1]))
const clientCalls = new Set([...clientSource.matchAll(/store\.([a-z]+)\(/g)].map((match) => match[1]))
const actionNames = new Set(['get', 'set', 'subscribe'])
const coreActions = new Set([...coreSource.matchAll(/^\s{6}([a-z][a-zA-Z]+): (async )?function/gm)].map((match) => match[1]))
for (const call of clientCalls) {
  if (actionNames.has(call)) continue
  check(coreActions.has(call), `client action "${call}" exists in the core`)
}
check(hostMethods.size === 12, `the host contract still lists ${hostMethods.size} methods`)

if (failures.length > 0) {
  console.error(`\nclient-core: ${failures.length} check(s) failed`)
  process.exitCode = 1
} else {
  console.log('\nclient-core: the browser half is testable and consistent')
}
