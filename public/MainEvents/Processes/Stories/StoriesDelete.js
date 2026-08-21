import * as path from 'path'
import { getProcessParams } from '../Helpers/ProcessParams.js'
import { rmDirectory } from '../../Helpers/Files.js'

// Frame fields are '*'-delimited: a '*' inside a message would corrupt the frame.
const frameSafe = (str) => String(str).replaceAll('*', ' ')

function main (storiesPath) {
  process.stdout.write('*initialize*0*1*')

  let i = 0
  for (const storyPath of storiesPath) {
    process.stdout.write('*stories-deleting*' + (++i) + '*' + storiesPath.length + '*')
    try {
      rmDirectory(storyPath)
    } catch (e) {
      // One unremovable story (busy file, read-only media…) must not abort the
      // whole batch: report it as a warning and keep deleting the rest.
      process.stdout.write(
        '*error-warning*stories-delete-error*' +
        frameSafe(path.basename(storyPath) + ' : ' + (e.code || e.message || e.toString())) + '*'
      )
    }
  }

  process.stdout.write('success')
}

const _params_ = getProcessParams()

if (_params_.length === 0) {
  process.stderr.write('no-file')
} else {
  main(_params_)
}
