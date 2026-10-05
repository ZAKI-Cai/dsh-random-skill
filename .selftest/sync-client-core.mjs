/**
 * Inline the browser core into the client bundle.
 *
 * `lib/client.js` must be a single self-contained script: the DSH client module
 * system loads one file per plugin, and an extra file that is not registered as a
 * static module would fail the whole bundle. `lib/client-core.js` is therefore kept
 * as the authoring source — it is what the tests and the reader read — and this
 * script copies it verbatim into the marked block inside `lib/client.js`.
 *
 * Run after editing `client-core.js`:
 *
 *   node .selftest/sync-client-core.mjs
 *
 * `.selftest/contract.mjs` fails when the two drift, so forgetting this is caught.
 *
 * @module dsh-skillbox/.selftest/sync-client-core
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const BEGIN = '\t\t//#region skillbox: client/<core> (generated from lib/client-core.js — do not edit by hand)'
export const END = '\t\t//#endregion skillbox: client/<core>'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const corePath = join(root, 'lib', 'client-core.js')
const clientPath = join(root, 'lib', 'client.js')

/**
 * Splice the core source into a client bundle's marked block.
 *
 * @param clientSource - the current `lib/client.js` text.
 * @param coreSource - the current `lib/client-core.js` text.
 * @returns the updated client text.
 * @throws when the markers are missing.
 */
export function inlineCore(clientSource, coreSource) {
  const start = clientSource.indexOf(BEGIN)
  const end = clientSource.indexOf(END)
  if (start === -1 || end === -1 || end < start) {
    throw new Error('client.js: the generated core block markers are missing')
  }
  return `${clientSource.slice(0, start)}${BEGIN}\n${unwrapCore(coreSource)}\n${END}${clientSource.slice(end + END.length)}`
}

/**
 * Strip the standalone wrapper from the core so its declarations land in the
 * factory's scope.
 *
 * `client-core.js` ships as a classic script (an IIFE that publishes a factory), so
 * a Node test can evaluate it alone. Inlined into the bundle it must instead be a
 * plain declaration set: `createClientCore` has to be visible to the components
 * below, and a nested function inside an IIFE would not be.
 *
 * @param coreSource - the raw `lib/client-core.js` text.
 * @returns the same text with the wrapper removed and every line indented.
 */
export function unwrapCore(coreSource) {
  const lines = coreSource.replace(/\r\n/g, '\n').split('\n')
  const trimmed = lines.map((line) => line.trim())
  const openAt = trimmed.indexOf(';(function () {')
  const closeIndex = trimmed.lastIndexOf('})()')
  if (openAt === -1 || closeIndex <= openAt) {
    throw new Error('client-core.js: expected the classic-script IIFE wrapper')
  }
  const body = lines.slice(openAt + 1, closeIndex)
  // The tail of the core publishes the factory for standalone loads (a global and a
  // CommonJS export block). Neither belongs in the bundle: `createClientCore` is
  // already in scope there, and letting the core re-assign `module.exports` would
  // discard the bundle's own `exports.apply` / `exports.inject`. Both are removed by
  // position — filtering every `}` line would also delete braces that close real
  // blocks.
  const publicationAt = body.findIndex(
    (line) => line.includes('globalThis.__dshSkillboxCore = createClientCore') || line.includes("typeof module !== 'undefined'"),
  )
  const withoutPublication = publicationAt === -1 ? body : body.slice(0, publicationAt)
  const withoutDirective = withoutPublication.filter((line, index) => !(index === 0 && line.trim() === "'use strict'"))
  return withoutDirective
    .map((line) => (line === '' ? '' : `\t\t${line}`))
    .join('\n')
}

/** Read both files, splice, and report whether the bundle changed. */
export function sync({ write = true } = {}) {
  const clientSource = readFileSync(clientPath, 'utf8')
  const coreSource = readFileSync(corePath, 'utf8')
  const next = inlineCore(clientSource, coreSource)
  const changed = next !== clientSource
  if (write && changed) writeFileSync(clientPath, next, 'utf8')
  return { changed, next, clientSource, coreSource }
}

/** Whether the bundle already contains the current core verbatim. */
export function isInSync() {
  return !sync({ write: false }).changed
}

// `node .selftest/sync-client-core.mjs` runs it as a tool; importing it does not.
if (process.argv[1] !== undefined && process.argv[1].endsWith('sync-client-core.mjs')) {
  const { changed } = sync({ write: true })
  console.log(changed ? 'client.js: inlined the current client-core.js' : 'client.js: already in sync')
}
