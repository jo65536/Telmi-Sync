import * as fs from 'fs'
import * as path from 'path'

import { getProcessParams } from '../Helpers/ProcessParams.js'
import { getMusicPath } from '../Helpers/AppPaths.js'

function isFullyCopied (srcPath, dstPath) {
  return fs.existsSync(dstPath) && fs.statSync(dstPath).size === fs.statSync(srcPath).size
}

function copyReplacing (srcPath, dstPath) {
  if (fs.existsSync(dstPath)) {
    fs.rmSync(dstPath)
  }
  fs.copyFileSync(srcPath, dstPath)
}

function main (dstMusicsPath, musicsIds) {
  let i = 0
  for (const musicId of musicsIds) {
    process.stdout.write('*' + musicId + '*' + (++i) + '*' + musicsIds.length + '*')

    const
      srcMusicPath = getMusicPath(musicId),
      srcMusicPathMp3 = srcMusicPath + '.mp3',
      srcMusicPathImg = srcMusicPath + '.png',
      dstMusicPath = path.join(dstMusicsPath, musicId),
      dstMusicPathMp3 = dstMusicPath + '.mp3',
      dstMusicPathImg = dstMusicPath + '.png'

    if (!fs.existsSync(srcMusicPathMp3) || !fs.existsSync(srcMusicPathImg)) {
      continue
    }

    if (!isFullyCopied(srcMusicPathMp3, dstMusicPathMp3)) {
      copyReplacing(srcMusicPathMp3, dstMusicPathMp3)
    }

    if (!isFullyCopied(srcMusicPathImg, dstMusicPathImg)) {
      copyReplacing(srcMusicPathImg, dstMusicPathImg)
    }
  }
  process.stdout.write('success')
}

const _params_ = getProcessParams()

if (_params_.length === 0) {
  process.stderr.write('no-file')
} else {
  main(_params_.shift(), _params_)
}
