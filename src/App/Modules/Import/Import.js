import { useCallback, useState } from 'react'
import { useModal } from '../../Components/Modal/ModalHooks.js'
import { useElectronListener } from '../../Components/Electron/Hooks/UseElectronEvent.js'
import DropFiles from '../../Components/DropFiles/DropFiles.js'
import ModalImport from './ModalImport.js'

const {ipcRenderer} = window.require('electron')
function Import ({children}) {
  const
    [isProcessing, setIsProcessing] = useState(false),
    {addModal, rmModal} = useModal(),
    openImportModal = useCallback(
      (filesPath) => {
        if (isProcessing) {
          return
        }
        setIsProcessing(true)
        addModal(key => {
          const modal = <ModalImport key={key}
                                     files={filesPath}
                                     onClose={() => {
                                            setIsProcessing(false)
                                            rmModal(modal)
                                          }}/>
          return modal
        })
      },
      [addModal, rmModal, isProcessing, setIsProcessing]
    ),
    onFilesDropped = useCallback(
      (filesPath) => {
        ipcRenderer.send('import', filesPath)
        openImportModal(filesPath)
      },
      [openImportModal]
    )

  useElectronListener(
    'import-files-selected',
    (filesPath) => onFilesDropped(filesPath),
    [onFilesDropped]
  )

  return <DropFiles onFilesDropped={onFilesDropped}>{children}</DropFiles>
}

export default Import
