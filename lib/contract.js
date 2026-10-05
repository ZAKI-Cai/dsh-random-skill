/**
 * The host↔browser contract.
 *
 * One source of truth for the HTTP surface this plugin owns: its prefix, its
 * version, the method names, the failure codes, and the payload limits. The host
 * route table (`routes.js`) and the browser bundle (`client.js`) both read these
 * values, and `.selftest/contract.mjs` fails the build when either side drifts
 * from this file or from the other.
 *
 * This module is deliberately free of Node and DOM APIs so the same list can be
 * inlined into the browser bundle.
 *
 * @module dsh-skillbox/contract
 */

/** API prefix owned by this plugin's HTTP face. */
export const API_PREFIX = '/api/skillbox'

/**
 * Wire version of the host↔browser contract.
 *
 * Bump it when a method changes meaning or a payload field changes type. The
 * browser half reports a mismatch in the panel instead of failing silently.
 */
export const API_VERSION = 1

/** Largest request body the route accepts, in bytes. */
export const MAX_REQUEST_BYTES = 512 * 1024

/** Server-sent-events keep-alive period, in milliseconds. */
export const SSE_PING_MS = 25000

/**
 * Every method the route serves.
 *
 * `read` marks a method the route also accepts over `GET` with query parameters,
 * which exists so a human can probe the plugin from a command line.
 */
export const METHODS = {
  info: { read: true },
  list: { read: true },
  catalogue: { read: true },
  pending: { read: true },
  refresh: { read: true },
  diagnose: { read: true },
  kick: { read: false },
  replay: { read: false },
  toggle: { read: false },
  decide: { read: false },
  remove: { read: false },
  state: { read: false },
}

/** Stable failure codes. The browser half switches on these, never on messages. */
export const ERROR_CODES = {
  /** A request named a workspace this instance does not operate on. */
  WORKSPACE_REFUSED: 'workspace-refused',
  /** A request named the harness profile or home directory as a workspace. */
  CONFIG_DIR_REFUSED: 'config-dir-refused',
  /** The addressed skill has no metadata row. */
  UNKNOWN_SKILL: 'unknown-skill',
  /** The addressed skill's name is not a legal skill name. */
  INVALID_NAME: 'invalid-name',
  /** A lifecycle decision the host does not implement. */
  UNKNOWN_DECISION: 'unknown-decision',
  /** No catalogue entry matched the requested domain/family narrowing. */
  NO_MATCHING_TOPIC: 'no-matching-topic',
  /** Name collisions exhausted the generator's retries. */
  NAME_EXHAUSTED: 'name-exhausted',
  /** The request body exceeded {@link MAX_REQUEST_BYTES}. */
  BODY_TOO_LARGE: 'body-too-large',
  /** The request body was not JSON. */
  BAD_JSON: 'bad-json',
  /** The caller asked for a method this route does not serve. */
  UNKNOWN_METHOD: 'unknown-method',
  /** The method exists but not for this HTTP verb. */
  METHOD_NOT_ALLOWED: 'method-not-allowed',
  /** The skillbox's metadata file could not be read or written. */
  METADATA_UNREADABLE: 'metadata-unreadable',
  /** The request failed the connection fence. */
  UNAUTHORIZED: 'unauthorized',
  /** Anything not otherwise classified. */
  INTERNAL: 'internal',
}

/**
 * A failure that carries a stable code across the wire.
 *
 * The route serializes `code` and a human-readable message; the browser half
 * branches on `code` only, so wording can change without breaking callers.
 */
export class ContractError extends Error {
  /**
   * @param code - one of {@link ERROR_CODES}.
   * @param message - human-readable detail, shown to the operator.
   * @param details - optional extra context, serialized as-is.
   */
  constructor(code, message, details) {
    super(message)
    this.name = 'ContractError'
    this.code = code
    this.details = details
  }
}

/** The JSON envelope every non-SSE response uses. */
export function okEnvelope(value) {
  return { ok: true, apiVersion: API_VERSION, ...value }
}

/**
 * @param error - any thrown value.
 * @returns the JSON envelope for a failure, with a stable code.
 */
export function errorEnvelope(error) {
  if (error instanceof ContractError) {
    return { ok: false, apiVersion: API_VERSION, code: error.code, error: error.message, details: error.details }
  }
  return { ok: false, apiVersion: API_VERSION, code: ERROR_CODES.INTERNAL, error: String(error?.message ?? error) }
}

/**
 * Map a failure to the HTTP status the route answers with.
 *
 * @param error - any thrown value.
 * @returns the status code.
 */
export function statusOf(error) {
  if (!(error instanceof ContractError)) return 500
  switch (error.code) {
    case ERROR_CODES.UNKNOWN_METHOD:
      return 404
    case ERROR_CODES.METHOD_NOT_ALLOWED:
      return 405
    case ERROR_CODES.BODY_TOO_LARGE:
      return 413
    case ERROR_CODES.BAD_JSON:
      return 400
    default:
      return 400
  }
}

/**
 * Method names the browser half calls, in the order the contract lists them.
 *
 * The browser bundle keeps its own literal array (it cannot import this module);
 * `.selftest/contract.mjs` asserts the two stay identical.
 */
export const CLIENT_METHODS = [
  'info',
  'list',
  'catalogue',
  'pending',
  'refresh',
  'diagnose',
  'kick',
  'replay',
  'toggle',
  'decide',
  'remove',
  'state',
]
