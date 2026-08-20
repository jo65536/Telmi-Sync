import * as fs from 'fs'
import * as path from 'path'
import convertMusic from './ConvertMusic.js'
import { isAudioFile } from './Helpers/AudioFile.js'
import { runConcurrentPool } from '../Helpers/ConcurrencyPool.js'

const collectAudioFiles = (dir) => {
  let out = []
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out = out.concat(collectAudioFiles(p))
    } else if (entry.isFile() && isAudioFile(entry.name)) {
      out.push(p)
    }
  }
  return out
}

// Recursively imports every audio file under `folderPath` as music, running
// several conversions in parallel (one per CPU slot). Each pool slot gets its
// own tmp directory so parallel conversions never clobber each other's
// scratch files.
function convertFolderAudios (folderPath) {
  const files = collectAudioFiles(folderPath).sort((a, b) => a.localeCompare(b))

  if (!files.length) {
    process.stderr.write('no-audio-found')
    return
  }

  const total = files.length
  const claimedDst = new Set()
  let done = 0

  // '*' is illegal in the stdout frame protocol; strip it from names.
  const itemName = (file) => path.basename(file).replace(/\*/g, '')

  const finishOne = (file, isError) => {
    done += 1
    if (isError) {
      process.stdout.write('*error-warning*music-conversion-failed*' + itemName(file) + '*')
    }
    process.stdout.write('*task-item*' + (isError ? 'error' : 'done') + '*' + itemName(file) + '*')
    process.stdout.write('*importing-audio*' + done + '*' + total + '*')
  }

  runConcurrentPool((callback, slot) => {
    if (!files.length) {
      return false
    }
    const file = files.shift()
    process.stdout.write('*task-item*converting*' + itemName(file) + '*')
    // One bad file must not abort the batch: report a warning and continue,
    // even if convertMusic throws synchronously (which would otherwise leave
    // this pool slot idle and the batch never finishing).
    try {
      convertMusic(file, {
        emitProgress: false,
        tmpDir: 'music-' + process.pid + '-' + slot,
        claimedDst,
        onDone: () => { finishOne(file, false); callback() },
        onError: () => { finishOne(file, true); callback() }
      })
    } catch (e) {
      // Defer: calling the pool callback synchronously here would re-enter
      // runNext while this worker call is still on the stack and strand the
      // pool slot, so success would never be written. onDone/onError already
      // fire asynchronously; match that.
      finishOne(file, true)
      queueMicrotask(callback)
    }
    return true
  }).then(() => process.stdout.write('success'))
}

export default convertFolderAudios
