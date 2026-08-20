import * as fs from 'fs'
import * as path from 'path'
import runProcess from '../Processes/RunProcess.js'

const
  readMusic = (musicsPath) => {
    if (!fs.existsSync(musicsPath)) {
      return []
    }
    return fs.readdirSync(musicsPath)
      .filter((f) => path.extname(f) === '.mp3')
      .sort()
      .reduce(
        (acc, f) => {
          const
            name = path.parse(f).name,
            [artist, album, track, title] = name.split('_'),
            musicPath = path.join(musicsPath, f),
            imagePath = path.join(musicsPath, name + '.png')

          if (!fs.existsSync(imagePath)) {
            // Non-destructive: the cover png may simply not be written yet
            // (mid-import). Skip for now; the next refresh will pick it up.
            return acc
          }

          acc.push({
            id: name,
            music: musicPath,
            image: imagePath + '?t=' + Math.trunc(fs.statSync(imagePath).mtimeMs),
            track: parseInt(track, 10),
            size: fs.statSync(musicPath).size,
            title,
            album,
            artist
          })
          return acc
        },
        []
      )
  },
  deleteMusic = (mainWindow, musicPath, ids, onFinished) => {
    if (!Array.isArray(ids)) {
      return false
    }

    runProcess(
      mainWindow,
      path.join('Music', 'MusicDelete.js'),
      [musicPath, ...ids],
      () => {},
      () => {},
      () => {},
      onFinished
    )
    return true
  }

export {readMusic, deleteMusic}
