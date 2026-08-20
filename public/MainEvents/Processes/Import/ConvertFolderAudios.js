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
  let done = 0

  const finishOne = (file, isError) => {
    done += 1
    if (isError) {
      process.stdout.write('*error-warning*music-conversion-failed*' + path.basename(file) + '*')
    }
    process.stdout.write('*importing-audio*' + done + '*' + total + '*')
  }

  runConcurrentPool((callback, slot) => {
    if (!files.length) {
      return false
    }
    const file = files.shift()
    // One bad file must not abort the batch: report a warning and continue.
    convertMusic(file, {
      emitProgress: false,
      tmpDir: 'music-' + slot,
      onDone: () => { finishOne(file, false); callback() },
      onError: () => { finishOne(file, true); callback() }
    })
    return true
  }).then(() => process.stdout.write('success'))
}

export default convertFolderAudios
