import * as fs from 'fs'
import * as path from 'path'
import convertMusic from './ConvertMusic.js'
import { isAudioFile } from './Helpers/AudioFile.js'

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

// Recursively imports every audio file found anywhere under `folderPath` as
// music. Used when a dropped folder is not a recognized story pack — so a
// parent folder of albums/subfolders imports all its tracks at once.
function convertFolderAudios (folderPath) {
  const files = collectAudioFiles(folderPath).sort((a, b) => a.localeCompare(b))

  if (!files.length) {
    process.stderr.write('no-audio-found')
    return
  }

  let index = 0
  const next = () => {
    if (index >= files.length) {
      process.stdout.write('success')
      return
    }
    const file = files[index]
    process.stdout.write('*importing-audio*' + (index + 1) + '*' + files.length + '*')
    index += 1
    // One bad file must not abort the whole batch: report a warning and go on.
    convertMusic(file, {
      emitProgress: false,
      onDone: next,
      onError: () => {
        process.stdout.write('*error-warning*music-conversion-failed*' + path.basename(file) + '*')
        next()
      }
    })
  }
  next()
}

export default convertFolderAudios
