import {spawn} from 'child_process'
import {getExtraResourcesPath} from '../Helpers/AppPaths.js'
import * as path from 'path'

const
  getEjectFileName = () => {
    return process.platform === 'win32' ? 'eject.bat' : 'eject.sh'
  },

  getEjectFilePath = () => {
    return path.join(getExtraResourcesPath(), 'eject', process.platform, getEjectFileName())
  },

  pathEject = getEjectFilePath(),

  ejectDrive = (drive) => {
    return new Promise((resolve, reject) => {
      // A .bat needs cmd.exe to run on Windows; the eject.sh script is
      // executable and spawned directly on macOS/Linux (wrapping it in
      // cmd.exe there fails with ENOENT).
      const stream = process.platform === 'win32'
        ? spawn('cmd.exe', ['/c', pathEject, drive])
        : spawn(pathEject, [drive])

      // A spawn failure (missing/non-executable binary) is delivered as an
      // async 'error' event, not a synchronous throw; without this handler
      // the unhandled event crashes the whole main process.
      stream.on('error', (e) => {
        process.stdout.write('*' + e.toString() + '*0*1*')
        reject(e)
      })

      stream.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject()
        }
      })
    })
  }

export {ejectDrive}
