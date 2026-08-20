import * as path from 'path'
import * as fs from 'fs'
import {getExtraResourcesPath, getMusicPath, initTmpPath} from '../Helpers/AppPaths.js'
import { checkCoverExists, convertAudio } from './Helpers/AudioFile.js'
import { audioExtractMetadata, audioExtractPNG } from '../BinFiles/FFmpegCommand.js'
import { parseInfFile } from '../../Helpers/InfFiles.js'
import { getMusicBrainzCoverImage } from '../Helpers/MusicBrainzApi.js'
import { convertMusicImage } from './Helpers/ImageFile.js'
import { musicObjectToName } from '../../Helpers/Music.js'

function convertMusic (srcPath, opts = {}) {
  const
    emitProgress = opts.emitProgress !== false,
    tmpDirName = opts.tmpDir || 'music',
    onDone = opts.onDone || (() => process.stdout.write('success')),
    onError = opts.onError || ((e) => process.stderr.write('music-conversion-failed' + (e instanceof Error && e.message !== '' ? ' : ' + e.message : ''))),
    progress = (msg, cur, total) => { if (emitProgress) process.stdout.write('*' + msg + '*' + cur + '*' + total + '*') }

  progress('music-extracting-metadata', 0, 3)

  const
    tmpPath = initTmpPath(tmpDirName),
    tmpMetadataTxtPath = path.join(tmpPath, 'metadata.txt'),
    metadata = {
      artist: 'unknow',
      album: 'unknow',
      track: '00',
      title: path.parse(srcPath).name
    },

    stepConvertAudio = () => {
      const
        musicPath = getMusicPath(),
        fileName = musicObjectToName(metadata),
        musicFileName = fileName + '.mp3',
        coverFileName = fileName + '.png',
        coverPath = path.join(musicPath, coverFileName),
        musicDstPath = path.join(musicPath, musicFileName),

        stepCopyDefaultCover = () => {
          fs.copyFileSync(path.join(getExtraResourcesPath(), 'assets', 'images', 'unknow-album.png'), coverPath)
          onDone()
        },

        stepCheckCover = () => {
          if (fs.existsSync(coverPath)) {
            return onDone()
          }

          if (metadata.artist === 'unknow' || metadata.album === 'unknow') {
            return stepCopyDefaultCover()
          }

          getMusicBrainzCoverImage(metadata.artist, metadata.album, tmpPath)
            .then((pathFile) => {
              convertMusicImage(pathFile, coverPath)
                .then(() => {
                  if (!fs.existsSync(coverPath)) {
                    return stepCopyDefaultCover()
                  }
                  onDone()
                })
                .catch(stepCopyDefaultCover)
            })
            .catch(stepCopyDefaultCover)
        }

      progress('converting-audio', 1, 3)

      // Under parallel import several slots run in this same process, so a
      // shared claim set makes "is this output already being produced?"
      // atomic (single-threaded JS between check and add) — avoiding two slots
      // writing the same destination mp3 concurrently.
      if (fs.existsSync(musicDstPath) || (opts.claimedDst && opts.claimedDst.has(musicDstPath))) {
        onDone()
        return
      }
      if (opts.claimedDst) {
        opts.claimedDst.add(musicDstPath)
      }

      convertAudio(srcPath, musicDstPath, true, true)
        .then(() => {
          progress('music-searching-cover', 2, 3)

          if(checkCoverExists(metadata.artist, metadata.album, coverPath)) {
            return stepCheckCover()
          }

          audioExtractPNG(srcPath, coverPath)
            .then(stepCheckCover)
            .catch(stepCheckCover)
        })
        .catch(onError)
    }

  audioExtractMetadata(srcPath, tmpMetadataTxtPath)
    .then(() => {
      if (fs.existsSync(tmpMetadataTxtPath)) {
        const
          md = parseInfFile(fs.readFileSync(tmpMetadataTxtPath).toString('utf8')),
          track = parseInt((md.track || metadata.track).split('/')[0], 10)

        metadata.artist = md.artist || metadata.artist
        metadata.album = md.album || metadata.album
        metadata.track = (track < 10 ? '0' : '') + track
        metadata.title = md.title || metadata.title
      }
      stepConvertAudio()
    })
    .catch(stepConvertAudio)
}

export default convertMusic
