import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import { createPathDirectories } from './Files.js'
import { readStories } from './Stories.js'
import { readMusic } from './MusicFiles.js'
import { getTelmiOSStoriesPath, getTelmiOSMusicPath } from './TelmiOSPath.js'

const
  cacheFilePath = () => path.join(os.homedir(), '.telmi', 'cache', 'telmios-scan.json'),

  // Stable per-card id: a tiny file written on the card the first time it is
  // seen. Survives re-mounts and moving the card between machines. Falls back
  // to the drive path when the card is read-only or has no Saves dir.
  getCardId = (drive) => {
    const
      savesDir = path.join(drive, 'Saves'),
      idFile = path.join(savesDir, '.telmi-card-id')
    try {
      if (fs.existsSync(idFile)) {
        const id = fs.readFileSync(idFile, 'utf8').trim()
        if (id !== '') {
          return id
        }
      }
      createPathDirectories(savesDir)
      const id = crypto.randomUUID()
      fs.writeFileSync(idFile, id)
      return id
    } catch (e) {
      return 'drive:' + drive
    }
  },

  // Cheap change-detector for a directory: names + sizes + mtimes of its direct
  // entries. Path-independent (so a re-mounted card matches) and catches
  // anything added/removed/replaced on the card — by this app, another
  // machine, or the console itself.
  fingerprint = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
      return 'absent'
    }
    const
      names = fs.readdirSync(dirPath).sort(),
      hash = crypto.createHash('sha1')
    for (const name of names) {
      try {
        const st = fs.statSync(path.join(dirPath, name))
        hash.update(name + ':' + st.size + ':' + Math.trunc(st.mtimeMs) + '\n')
      } catch (e) {
        hash.update(name + ':err\n')
      }
    }
    return hash.digest('hex')
  },

  loadCache = () => {
    try {
      return JSON.parse(fs.readFileSync(cacheFilePath(), 'utf8'))
    } catch (e) {
      return {}
    }
  },

  saveCache = (cache) => {
    try {
      const file = cacheFilePath()
      createPathDirectories(path.dirname(file))
      fs.writeFileSync(file, JSON.stringify(cache))
    } catch (e) {
      // best-effort cache; a write failure just means the next scan re-reads
    }
  },

  // Rebuilds drive-specific absolute paths in a cached result when the card is
  // now mounted at a different drive than when it was scanned.
  rebase = (value, fromDrive, toDrive) => {
    if (value === undefined || fromDrive === toDrive) {
      return value
    }
    return JSON.parse(JSON.stringify(value).split(fromDrive).join(toDrive))
  },

  // Generic cached read: returns the cached parsed result when the on-card
  // fingerprint is unchanged, otherwise reads fresh and updates the cache.
  cachedRead = (drive, kind, dirPath, reader) => {
    const
      id = getCardId(drive),
      fp = fingerprint(dirPath),
      cache = loadCache(),
      entry = cache[id] || {},
      scanDriveKey = kind + 'ScanDrive'

    // Stories and musics are cached independently, each with its own source
    // drive, so a remount that re-reads one side never leaves the other side's
    // cached paths mislabeled.
    if (entry[kind + 'Fingerprint'] === fp && entry[kind] !== undefined && entry[scanDriveKey] !== undefined) {
      return {value: rebase(entry[kind], entry[scanDriveKey], drive), fromCache: true}
    }

    const value = reader(dirPath)
    cache[id] = {
      ...entry,
      [kind + 'Fingerprint']: fp,
      [kind]: value,
      [scanDriveKey]: drive,
      at: Date.now()
    }
    saveCache(cache)
    return {value, fromCache: false}
  },

  getCachedStories = (drive) => cachedRead(drive, 'stories', getTelmiOSStoriesPath(drive), readStories).value,
  getCachedMusics = (drive) => cachedRead(drive, 'musics', getTelmiOSMusicPath(drive), readMusic).value

export { getCachedStories, getCachedMusics, getCardId, fingerprint }
