/**
 * On-disk skillbox: the workspace-local store this plugin owns.
 *
 * Layout inside one workspace root:
 *
 * ```
 * <workspace>/skillbox/<skill-name>/SKILL.md   the permanent home of a skill
 * <workspace>/skillbox/.skillbox.json          plugin-owned metadata
 * <workspace>/.dsh/skills/<skill-name>/SKILL.md enabled copy the agent can see
 * ```
 *
 * "Enabled" always means the enabled copy exists, because that directory is the
 * project skill root `@deepseek-ai/dsh-skill-filesystem` discovers and watches.
 * The copy is therefore the single switch that decides whether the model sees a
 * skill, and the filesystem provider keeps the session catalog current on its
 * own.
 *
 * @module dsh-skillbox/store
 */

import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

/** Metadata file inside the skillbox folder. */
export const META_FILE = '.skillbox.json'

/** Folder names that may never be used as a skill folder. */
const RESERVED = new Set([META_FILE, '.', '..'])

/** Lifecycle states a skillbox entry can be in. */
export const STATES = ['trial', 'kept', 'disabled']

/** Public shape returned to the UI for one skill. */
function toView(entry, extra = {}) {
  return {
    name: entry.name,
    description: entry.description,
    whenToUse: entry.whenToUse ?? '',
    group: entry.group ?? 'random',
    state: entry.state,
    enabled: entry.enabled === true,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt ?? entry.createdAt,
    path: entry.path,
    ...extra,
  }
}

/**
 * The workspace-scoped skillbox.
 *
 * One instance owns one workspace root. It never assumes the folders exist: every
 * read tolerates a missing skillbox, and the constructor-time {@link ensure}
 * creates the layout an installation needs.
 */
export class Skillbox {
  /**
   * @param root - absolute workspace root this skillbox belongs to.
   */
  constructor(root) {
    this.root = resolve(root)
    this.dir = join(this.root, 'skillbox')
    this.metaPath = join(this.dir, META_FILE)
    this.enabledDir = join(this.root, '.dsh', 'skills')
  }

  /**
   * Create `<workspace>/skillbox` and its metadata file when absent.
   *
   * @returns `{ created: boolean }` — `true` when this call created the folder.
   */
  async ensure() {
    let created = false
    try {
      const info = await stat(this.dir)
      if (!info.isDirectory()) throw new Error(`skillbox 路径已被同名文件占用：${this.dir}`)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
      await mkdir(this.dir, { recursive: true })
      created = true
    }
    const meta = await this.readMeta()
    if (meta === undefined) await this.writeMeta({ version: 1, skills: {}, pending: null })
    return { created }
  }

  /** Absolute path of a skill's folder. */
  dirOf(name) {
    if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(name) || RESERVED.has(name)) {
      throw new Error(`skillbox: 非法的 skill 名称 "${String(name)}"`)
    }
    const path = resolve(join(this.dir, name))
    if (path !== join(this.dir, name) || !path.startsWith(this.dir + sep)) {
      throw new Error(`skillbox: skill 名称越出 skillbox 目录 "${name}"`)
    }
    return path
  }

  /** Absolute path of a skill's instruction file inside the skillbox. */
  fileOf(name) {
    return join(this.dirOf(name), 'SKILL.md')
  }

  /** Absolute path of a skill's enabled copy under `<workspace>/.dsh/skills`. */
  enabledFileOf(name) {
    return join(this.enabledDir, name, 'SKILL.md')
  }

  /** Metadata document, or `undefined` when no skillbox exists yet. */
  async readMeta() {
    try {
      const text = await readFile(this.metaPath, 'utf8')
      const parsed = JSON.parse(text)
      if (parsed === null || typeof parsed !== 'object') return undefined
      const skills = parsed.skills !== null && typeof parsed.skills === 'object' ? parsed.skills : {}
      return { version: 1, skills, pending: parsed.pending ?? null }
    } catch (error) {
      if (error?.code === 'ENOENT') return undefined
      // A corrupt metadata file must not take the whole plugin down: rebuild it
      // from what is on disk instead of failing every later read.
      return { version: 1, skills: {}, pending: null, recoveredFrom: String(error?.message ?? error) }
    }
  }

  /** Write the metadata document atomically. */
  async writeMeta(meta) {
    await mkdir(this.dir, { recursive: true })
    const next = { version: 1, skills: meta.skills ?? {}, pending: meta.pending ?? null }
    const temp = `${this.metaPath}.${process.pid}.tmp`
    await writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
    await rename(temp, this.metaPath)
    return next
  }

  /** Read one skill's instruction body from the skillbox. */
  async readBody(name) {
    return readFile(this.fileOf(name), 'utf8')
  }

  /** Parse the `name`/`description`/`whenToUse` a body declares in its frontmatter. */
  static parseFrontmatter(text) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
    if (match === null) return {}
    const out = {}
    for (const line of match[1].split(/\r?\n/)) {
      const kv = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line)
      if (kv === null) continue
      out[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '')
    }
    return out
  }

  /**
   * Merge the on-disk skillbox with the metadata document.
   *
   * The filesystem is the source of truth for membership: a folder found on disk
   * without metadata is adopted as an externally imported skill, and a metadata
   * row without a folder is reported as missing rather than silently kept.
   *
   * @returns the current skill list plus the pending decision name.
   */
  async list() {
    await this.ensure()
    const meta = (await this.readMeta()) ?? { version: 1, skills: {}, pending: null }
    const entries = []
    let folders = []
    try {
      folders = await readdir(this.dir, { withFileTypes: true })
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }

    for (const folder of folders) {
      if (!folder.isDirectory() || RESERVED.has(folder.name)) continue
      const name = folder.name
      const body = await readFile(join(this.dir, name, 'SKILL.md'), 'utf8').catch(() => undefined)
      if (body === undefined) continue
      const front = Skillbox.parseFrontmatter(body)
      const record = meta.skills[name] ?? {}
      const enabled = await this.isEnabled(name)
      const state = STATES.includes(record.state) ? record.state : enabled ? 'kept' : 'disabled'
      entries.push(
        toView({
          name,
          description: record.description ?? front.description ?? '',
          whenToUse: record.whenToUse ?? front.whenToUse,
          group: record.group,
          state,
          enabled,
          createdAt: record.createdAt ?? 0,
          updatedAt: record.updatedAt,
          path: join(this.dir, name),
        }),
      )
    }

    // Metadata rows whose folder disappeared are reported so the sidebar can
    // explain a skill that was removed outside the plugin.
    for (const [name, record] of Object.entries(meta.skills)) {
      if (entries.some((entry) => entry.name === name)) continue
      entries.push({ ...record, name, missing: true, group: record.group ?? 'random' })
    }

    entries.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || a.name.localeCompare(b.name))
    const pending = entries.find((entry) => entry.state === 'trial' && entry.missing !== true)
    return { skills: entries, pending: pending?.name ?? null }
  }

  /** Whether a skill's enabled copy currently exists. */
  async isEnabled(name) {
    try {
      const info = await stat(this.enabledFileOf(name))
      return info.isFile()
    } catch {
      return false
    }
  }

  /**
   * Write a skill into the skillbox and record its metadata.
   *
   * @param skill - `{ name, description, whenToUse, body, group }`.
   * @param meta - initial lifecycle metadata: `state`, plus any descriptive fields
   *   the caller wants kept next to the skill (domain, family, recipe, window).
   */
  async add(skill, meta = {}) {
    await this.ensure()
    const dir = this.dirOf(skill.name)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'SKILL.md'), skill.body, 'utf8')
    const current = (await this.readMeta()) ?? { version: 1, skills: {}, pending: null }
    const now = Date.now()
    const described = Object.fromEntries(
      Object.entries(meta).filter(([key, value]) => key !== 'state' && value !== undefined),
    )
    current.skills[skill.name] = {
      name: skill.name,
      description: skill.description,
      whenToUse: skill.whenToUse ?? '',
      group: meta.group ?? 'random',
      ...described,
      state: meta.state ?? 'trial',
      createdAt: now,
      updatedAt: now,
    }
    current.pending = meta.state === 'trial' ? skill.name : current.pending
    await this.writeMeta(current)
    return toView({ ...current.skills[skill.name], enabled: await this.isEnabled(skill.name), path: dir })
  }

  /** Patch one skill's metadata row. */
  async patch(name, changes) {
    const current = (await this.readMeta()) ?? { version: 1, skills: {}, pending: null }
    const record = current.skills[name]
    if (record === undefined) throw new Error(`skillbox: 未登记的 skill "${name}"`)
    current.skills[name] = { ...record, ...changes, updatedAt: Date.now() }
    if (changes.state !== undefined) {
      if (changes.state === 'trial') current.pending = name
      else if (current.pending === name) current.pending = null
    }
    await this.writeMeta(current)
    return toView({ ...current.skills[name], enabled: await this.isEnabled(name), path: this.dirOf(name) })
  }

  /** Read one metadata row. */
  async record(name) {
    const current = (await this.readMeta()) ?? { version: 1, skills: {}, pending: null }
    return current.skills[name]
  }

  /**
   * Add or remove the enabled copy under `<workspace>/.dsh/skills`.
   *
   * @param name - skill name.
   * @param enabled - desired visibility.
   * @returns `{ changed, enabled }`.
   */
  async setEnabled(name, enabled) {
    const body = await this.readBody(name)
    const target = this.enabledFileOf(name)
    const currentlyEnabled = await this.isEnabled(name)
    if (enabled === currentlyEnabled) return { changed: false, enabled: currentlyEnabled }
    if (enabled) {
      await mkdir(join(this.enabledDir, name), { recursive: true })
      await writeFile(target, body, 'utf8')
    } else {
      await rm(join(this.enabledDir, name), { recursive: true, force: true })
    }
    return { changed: true, enabled }
  }

  /** Delete a skill folder, its enabled copy, and its metadata row. */
  async remove(name) {
    const dir = this.dirOf(name)
    await rm(dir, { recursive: true, force: true })
    await rm(join(this.enabledDir, name), { recursive: true, force: true })
    const current = (await this.readMeta()) ?? { version: 1, skills: {}, pending: null }
    delete current.skills[name]
    if (current.pending === name) current.pending = null
    await this.writeMeta(current)
    return { removed: name }
  }

  /** Apply a lifecycle decision to a skill. */
  async decide(name, decision) {
    if (decision === 'keep') {
      await this.setEnabled(name, true)
      return { name, decision, skill: await this.patch(name, { state: 'kept' }) }
    }
    if (decision === 'disable') {
      await this.setEnabled(name, false)
      return { name, decision, skill: await this.patch(name, { state: 'disabled' }) }
    }
    if (decision === 'delete') return { ...(await this.remove(name)), decision }
    throw new Error(`skillbox: 未知的决策 "${String(decision)}"`)
  }
}

/** Path helpers exported for callers that only need addresses. */
export const paths = { META_FILE }
