import { useCallback, useEffect, useState } from 'react'
import ModalTaskVisualizer from '../../Components/Modal/Templates/ModalTasksVisualizer/ModalTasksVisualizer.js'
import { useElectronListener } from '../../Components/Electron/Hooks/UseElectronEvent.js'
import { useLocale } from '../../Components/Locale/LocaleHooks.js'

const {ipcRenderer} = window.require('electron')
function ModalImport ({files, onClose}) {
  const
    {getLocale} = useLocale(),
    [isSuccess, setIsSuccess] = useState(false),
    [processingFile, setProcessingFile] = useState(null),
    [waitingFiles, setWaitingFiles] = useState(files),
    [errorFiles, setErrorFiles] = useState([]),
    [isClosable, setIsClosable] = useState(false),

    onCancel = useCallback(() => ipcRenderer.send('import-cancel'), [])

  useElectronListener(
    'import-task',
    (file, message, current, total) => {
      if (file === '' && message === '' && current === 0 && total === 0) {
        setProcessingFile(null)
      } else {
        setProcessingFile({task: file, message, current, total})
      }
    },
    [setProcessingFile]
  )

  useElectronListener(
    'import-waiting',
    (waitingFiles) => setWaitingFiles(waitingFiles),
    [setWaitingFiles]
  )

  useElectronListener(
    'import-error',
    (file, error) => setErrorFiles((errors) => ([
      ...errors,
      {task: file, message: error}
    ])),
    [setErrorFiles]
  )

  useEffect(() => {
    if (processingFile === null && !waitingFiles.length) {
      if (!errorFiles.length) {
        setIsSuccess(true)
        const timeout = setTimeout(onClose, 1800)
        return () => clearTimeout(timeout)
      } else {
        setIsClosable(true)
      }
    } else {
      setIsSuccess(false)
      setIsClosable(false)
    }
  }, [processingFile, waitingFiles, errorFiles, onClose, setIsClosable, setIsSuccess])

  return <ModalTaskVisualizer errorTasks={errorFiles}
                              successMessage={isSuccess ? getLocale('import-success') : undefined}
                              processingTask={processingFile}
                              onCancelTask={onCancel}
                              waitingTasks={waitingFiles}
                              isClosable={isClosable}
                              onClose={onClose}/>
}

export default ModalImport
