/**
 * Contract drift test.
 *
 * The browser bundle cannot import `lib/contract.js`, so its constants are a
 * mirror. This test is what makes that mirror safe: it parses the bundle's source,
 * compares its literals with the host's, and asserts that every method the client
 * may call has an implementation on the host side.
 *
 * Usage: node .selftest/contract.mjs
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  API_PREFIX,
  API_VERSION,
  CLIENT_METHODS,
  ERROR_CODES,
  METHODS,
} from '../lib/contract.js'
import { TOOL_PENDING, TOOL_DECIDE, PENDING_OUTPUT_SCHEMA, DECIDE_OUTPUT_SCHEMA, DECIDE_PARAMETERS } from '../lib/tool-contract.js'

const here = dirname(fileURLToPath(import.meta.url))
const clientSource = readFileSync(join(here, '..', 'lib', 'client.js'), 'utf8')
const coreSource = readFileSync(join(here, '..', 'lib', 'client-core.js'), 'utf8')
const indexSource = readFileSync(join(here, '..', 'lib', 'index.js'), 'utf8')

const failures = []
const check = (condition, message) => {
  if (condition) {
    console.log(`ok   ${message}`)
  } else {
    failures.push(message)
    console.log(`FAIL ${message}`)
  }
}

/**
 * Read one entry out of the browser core's `CONTRACT` table.
 *
 * The browser bundle cannot import `lib/contract.js`, so `client-core.js` restates
 * the contract; this is the check that keeps the restatement honest.
 */
function coreContract(name) {
  const table = /var CONTRACT = \{([\s\S]*?)\n  \}\n/.exec(coreSource)
  if (table === null) return undefined
  return readLiteral(table[1], name)
}

/** Read `name: <literal>` out of a source slice. */
function readLiteral(source, name) {
  // Built from a string, so every escape needs doubling: `\\[` reaches the regex
  // engine as `\[`.
  const entry = new RegExp(`${name}: (\\[[^\\]]*\\]|"[^"]*"|'[^']*'|\\d+)`).exec(source)
  if (entry === null) return undefined
  return Function(`"use strict"; return (${entry[1]})`)()
}

// 1. The API prefix and version the browser half addresses.
check(coreContract('API_PREFIX') === API_PREFIX, `client-core API_PREFIX mirrors the host (${API_PREFIX})`)
check(coreContract('API_VERSION') === API_VERSION, `client-core API_VERSION mirrors the host (${API_VERSION})`)

// 2. The method list, in the same order, with no entry either side lacks.
const clientMethods = coreContract('CLIENT_METHODS')
check(Array.isArray(clientMethods), 'client-core CLIENT_METHODS is a literal array')
check(
  JSON.stringify(clientMethods) === JSON.stringify(CLIENT_METHODS),
  `client-core CLIENT_METHODS matches contract.CLIENT_METHODS (${CLIENT_METHODS.length} methods)`,
)
check(
  JSON.stringify(Object.keys(METHODS)) === JSON.stringify(CLIENT_METHODS),
  'contract.METHODS declares exactly the client-callable set, in the same order',
)

// 3. Every method the client calls has a host implementation.
for (const method of clientMethods ?? []) {
  const implemented = new RegExp(`\\n\\s{4}${method}: `).test(indexSource)
  check(implemented, `host implements "${method}"`)
}

// 4. Every method the browser half may call is used somewhere, and every action the
//    panel invokes exists on the core. `refresh` and `diagnose` are deliberately
//    command-line-only probes (`.selftest/probe.ps1`), so `client.js` need not call
//    them; the core still has to implement every action the panel names.
const CALLS_FROM_PANEL = new Set(CLIENT_METHODS.filter((method) => method !== 'state' && method !== 'refresh' && method !== 'diagnose'))
const called = new Set([...coreSource.matchAll(/call\('([a-z]+)'/g)].map((match) => match[1]))
check(called.size > 0, `client-core makes ${called.size} distinct host calls`)
for (const method of called) {
  check(CLIENT_METHODS.includes(method), `client-core call "${method}" is inside the contract`)
}
for (const method of CALLS_FROM_PANEL) {
  check(called.has(method), `panel-facing method "${method}" is reachable from the browser half`)
}

const coreActions = new Set([...coreSource.matchAll(/^\s{6}([a-z][a-zA-Z]+): (async )?function/gm)].map((match) => match[1]))
const panelActions = new Set([...clientSource.matchAll(/store\.([a-z][a-zA-Z]+)\(/g)].map((match) => match[1]))
for (const action of panelActions) {
  if (action === 'get' || action === 'set' || action === 'subscribe') continue
  check(coreActions.has(action), `client.js action "${action}" is implemented by the core`)
}

// 5. Failure codes: the core mirrors them, and the envelope carries one.
const codeBlock = /ERROR_CODES: \{([\s\S]*?)\n    \}/.exec(coreSource)
check(codeBlock !== null, 'client-core declares an ERROR_CODES mirror')
if (codeBlock !== null) {
  const coreCodes = new Set([...codeBlock[1].matchAll(/'([a-z-]+)'/g)].map((match) => match[1]))
  const hostCodes = new Set(Object.values(ERROR_CODES))
  const missing = [...hostCodes].filter((code) => !coreCodes.has(code))
  const extra = [...coreCodes].filter((code) => !hostCodes.has(code))
  check(missing.length === 0, `client-core knows every host failure code${missing.length === 0 ? '' : ` (missing ${missing.join(', ')})`}`)
  check(extra.length === 0, `client-core invents no failure code${extra.length === 0 ? '' : ` (extra ${extra.join(', ')})`}`)
}

// 6. Tool schemas stay declarative and complete: every property the renderer reads
//    must be declared, or a renderer would silently print "undefined".
const pendingFields = new Set(Object.keys(PENDING_OUTPUT_SCHEMA.properties))
for (const field of ['name', 'description', 'whenToUse', 'domain', 'familySubject', 'recipeLabel', 'characters', 'seed', 'instructions', 'state', 'waitForDecision']) {
  check(pendingFields.has(field), `skillbox_pending result declares "${field}"`)
}
const decideFields = new Set(Object.keys(DECIDE_OUTPUT_SCHEMA.properties))
for (const field of ['name', 'state', 'kept', 'message']) {
  check(decideFields.has(field), `skillbox_decide result declares "${field}"`)
}
check(Object.keys(DECIDE_PARAMETERS).includes('name'), 'skillbox_decide requires a name parameter')
check(TOOL_PENDING === 'skillbox_pending' && TOOL_DECIDE === 'skillbox_decide', 'tool wire names are stable')

// 7. Each tool's renderer must only read fields its own result schema declares.
const toolsSource = readFileSync(join(here, '..', 'lib', 'tools.js'), 'utf8')
const renderers = [
  { tool: TOOL_PENDING, fields: pendingFields, start: toolsSource.indexOf('name: TOOL_PENDING'), end: toolsSource.indexOf('name: TOOL_DECIDE') },
  { tool: TOOL_DECIDE, fields: decideFields, start: toolsSource.indexOf('name: TOOL_DECIDE'), end: toolsSource.length },
]
for (const { tool, fields, start, end } of renderers) {
  check(start >= 0, `${tool} registers with the contract's wire name`)
  for (const match of toolsSource.slice(start, end).matchAll(/value\.([a-zA-Z]+)/g)) {
    check(fields.has(match[1]), `${tool} renderer reads declared field "${match[1]}"`)
  }
}

if (failures.length > 0) {
  console.error(`\ncontract: ${failures.length} check(s) failed`)
  process.exitCode = 1
} else {
  console.log('\ncontract: host and client agree')
}
