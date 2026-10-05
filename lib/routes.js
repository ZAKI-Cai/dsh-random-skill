/**
 * The host's HTTP face.
 *
 * One responsibility: turn a request into a call on the skillbox methods and a
 * response back, applying the same fence the built-in `/api` channel applies. The
 * web server routes by longest prefix, so this plugin's `/api/skillbox` route sits
 * in front of `ctx.connection`'s authenticated `/api` handler and must therefore
 * admit every request itself.
 *
 * @module dsh-skillbox/routes
 */

import {
  API_PREFIX,
  API_VERSION,
  ContractError,
  ERROR_CODES,
  MAX_REQUEST_BYTES,
  METHODS,
  SSE_PING_MS,
  errorEnvelope,
  okEnvelope,
  statusOf,
} from './contract.js'

/** @returns whether a method name is one this route serves. */
export function isKnownMethod(method) {
  return Object.hasOwn(METHODS, method)
}

/** @returns whether a method may be called with `GET` as well as `POST`. */
export function isReadMethod(method) {
  return METHODS[method]?.read === true
}

/**
 * Read and parse a JSON request body under a hard cap.
 *
 * @param req - the incoming request.
 * @returns the parsed body, `{}` for an empty body.
 * @throws {ContractError} `BODY_TOO_LARGE` or `BAD_JSON`.
 */
export async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_REQUEST_BYTES) throw new ContractError(ERROR_CODES.BODY_TOO_LARGE, 'skillbox: 请求体过大')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  try {
    const parsed = JSON.parse(text)
    return parsed !== null && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    throw new ContractError(ERROR_CODES.BAD_JSON, `skillbox: 请求体不是合法 JSON（${String(error?.message ?? error)}）`)
  }
}

/** Write one JSON response. */
export function sendJson(res, status, value) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(value))
}

/**
 * Apply the connection fence and answer the request when it fails.
 *
 * @param ctx - host plugin context.
 * @param req - the incoming request.
 * @param res - the response to reject on.
 * @returns `false` once a rejection was written.
 */
export function admitRequest(ctx, req, res, log) {
  const connection = ctx.get('connection')
  if (connection === undefined || typeof connection.admit !== 'function') {
    // No connection service means no browser fence exists in this composition;
    // loopback-only deployments (the desktop host) are the only reachable ones.
    return true
  }
  try {
    const admission = connection.admit(req)
    if (admission !== undefined && 'rejection' in admission) {
      const status = admission.rejection === 401 ? 401 : 403
      res.statusCode = status
      res.setHeader('content-type', 'text/plain; charset=utf-8')
      res.setHeader('cache-control', 'no-store')
      res.end(status === 401 ? 'unauthorized' : 'forbidden')
      return false
    }
  } catch (error) {
    log?.('warn', 'skillbox: 认证检查失败，已拒绝请求', error?.message ?? error)
    res.statusCode = 403
    res.end('forbidden')
    return false
  }
  return true
}

/**
 * Create the route handler for this plugin's prefix.
 *
 * @param options - collaborators.
 * @param options.ctx - host plugin context (for the fence and sessions).
 * @param options.methods - the skillbox method table.
 * @param options.sessionOf - resolves a session from the request URL.
 * @param options.workspaceRootOf - resolves the active workspace root.
 * @param options.admit - validates a requested workspace root.
 * @param options.listeners - the SSE listener set, mutated by the events route.
 * @param options.log - `(level, message, detail)` logger.
 * @returns the `(req, res)` handler.
 */
export function createRouteHandler(options) {
  const { ctx, methods, sessionOf, workspaceRootOf, admit, listeners, log } = options

  return async function handle(req, res) {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const method = url.pathname.slice(API_PREFIX.length).replace(/^\//, '')

    if (!admitRequest(ctx, req, res, log)) return undefined

    try {
      if (method === 'events') {
        if (req.method !== 'GET') {
          return sendJson(res, 405, errorEnvelope(new ContractError(ERROR_CODES.METHOD_NOT_ALLOWED, 'events 只支持 GET')))
        }
        res.statusCode = 200
        res.setHeader('content-type', 'text/event-stream; charset=utf-8')
        res.setHeader('cache-control', 'no-store')
        res.setHeader('connection', 'keep-alive')
        res.write(`event: hello\ndata: ${JSON.stringify({ apiVersion: API_VERSION, root: workspaceRootOf(sessionOf(url)) })}\n\n`)
        const listener = (payload) => {
          try {
            res.write(`data: ${JSON.stringify(payload)}\n\n`)
          } catch {
            /* the client went away; cleanup happens on close */
          }
        }
        listeners.add(listener)
        const keepAlive = setInterval(() => {
          try {
            res.write(': ping\n\n')
          } catch {
            /* ignore */
          }
        }, SSE_PING_MS)
        const cleanup = () => {
          clearInterval(keepAlive)
          listeners.delete(listener)
        }
        req.on('close', cleanup)
        res.on('close', cleanup)
        return undefined
      }

      if (!isKnownMethod(method)) {
        const error = new ContractError(ERROR_CODES.UNKNOWN_METHOD, `skillbox: 未知方法 "${method}"`)
        return sendJson(res, statusOf(error), errorEnvelope(error))
      }
      if (req.method !== 'POST' && !isReadMethod(method)) {
        const error = new ContractError(ERROR_CODES.METHOD_NOT_ALLOWED, `skillbox: ${method} 只支持 POST`)
        return sendJson(res, statusOf(error), errorEnvelope(error))
      }

      const payload = req.method === 'POST' ? await readJson(req) : Object.fromEntries(url.searchParams)
      admit(payload?.root)
      const value = await methods[method](payload, sessionOf(url))
      return sendJson(res, 200, okEnvelope(value))
    } catch (error) {
      log?.('warn', 'skillbox: 请求失败', error?.message ?? error)
      return sendJson(res, statusOf(error), errorEnvelope(error))
    }
  }
}
