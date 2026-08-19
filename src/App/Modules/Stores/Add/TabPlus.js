import { useCallback } from 'react'
import { useLocale } from '../../../Components/Locale/LocaleHooks.js'
import { useModal } from '../../../Components/Modal/ModalHooks.js'
import ButtonIconPlus from '../../../Components/Buttons/Icons/ButtonIconPlus.js'
import ModalStoreFormAdd from './ModalStoreFormAdd.js'
import ModalPodcastSearch from './ModalPodcastSearch.js'

import styles from './StoreAdd.module.scss'

const {ipcRenderer} = window.require('electron')

function TabPlus () {
  const
    {getLocale} = useLocale(),
    {addModal, rmModal} = useModal(),
    onValidate = useCallback((store) => ipcRenderer.send('store-add', store), []),
    openManual = useCallback(() => {
      addModal((key) => {
        const modal = <ModalStoreFormAdd key={key}
                                         onClose={() => rmModal(modal)}
                                         onValidate={onValidate}/>
        return modal
      })
    }, [addModal, rmModal, onValidate]),
    onCLick = useCallback(
      () => {
        addModal((key) => {
          const modal = <ModalPodcastSearch key={key}
                                            onClose={() => rmModal(modal)}
                                            onManual={openManual}
                                            onValidate={onValidate}/>
          return modal
        })
      },
      [addModal, rmModal, openManual, onValidate]
    )

  return <ButtonIconPlus className={styles.plusButton} onClick={onCLick} title={getLocale('store-add')}/>
}

export default TabPlus
