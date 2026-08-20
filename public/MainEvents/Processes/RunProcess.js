import {utilityProcess} from 'electron'
import * as url from 'url'
import * as path from 'path'
import {getElectronAppPath} from '../Helpers/AppPaths.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

function runProcess(mainWindow, jsFile, arrayParams, onSuccess, onProgress, onError, onFinished, onItem) {
  const
    taskProcess = utilityProcess.fork(
      path.join(__dirname, jsFile),
      ['[electron-apppath]' + getElectronAppPath(), ...arrayParams.map(v => '[electron]' + v)],
      {stdio: 'pipe'}
    )

  // Children write '*message*current*total*' frames plus a final bare
  // 'success' token. Pipe chunks are not aligned to writes, so frames are
  // reassembled across chunk boundaries instead of assuming one chunk = one
  // whole frame (a split frame used to kill a healthy task as an error).
  let stdoutBuffer = ''

  taskProcess.stdout.on('data', (data) => {
    stdoutBuffer += data.toString()

    while (stdoutBuffer !== '') {
      if (stdoutBuffer.substring(0, 7) === 'success') {
        taskProcess.kill()
        onSuccess()
        return
      }

      if (stdoutBuffer.charAt(0) !== '*') {
        if ('success'.substring(0, stdoutBuffer.length) === stdoutBuffer) {
          // partial 'success' token: wait for the next chunk
          return
        }
        taskProcess.kill()
        onError('unexpected-process-output : ' + stdoutBuffer)
        return
      }

      const parts = stdoutBuffer.split('*')
      if (parts.length < 5) {
        // incomplete frame: wait for the next chunk
        return
      }

      const [, message, current, total] = parts
      stdoutBuffer = stdoutBuffer.substring(message.length + current.length + total.length + 4)

      if (message === 'error-warning') {
        mainWindow.webContents.send('error-warning', {title: current, message: total})
      } else if (message === 'task-item') {
        // Per-item detail (e.g. one line per music being converted); current is
        // the status (converting/done/error), total is the item name.
        if (typeof onItem === 'function') {
          onItem(current, total)
        }
      } else {
        onProgress(message, current, total)
      }
    }
  })

  taskProcess.stderr.on('data', (data) => {
    console.log('RunProcess Error : ', data.toString())
    taskProcess.kill()
    onError(data.toString())
  })

  taskProcess.once('exit', (code) => {
    console.log('exit', code)
    onFinished()
  })

  return {
    process: taskProcess,
    params: arrayParams
  }
}

export default runProcess
