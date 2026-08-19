import { useCallback, useEffect } from 'react'
import ButtonIconXMark from '../Buttons/Icons/ButtonIconXMark.js'

import styles from './Modal.module.scss'
function ModalLayout ({className, children, isClosable, onClose}) {
  const onBackdropClick = useCallback(
    (e) => {
      if (isClosable && typeof onClose === 'function' && e.target === e.currentTarget) {
        onClose()
      }
    },
    [isClosable, onClose]
  )

  useEffect(
    () => {
      if (!isClosable || typeof onClose !== 'function') {
        return
      }
      const onKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    },
    [isClosable, onClose]
  )

  return <div className={styles.container} onClick={onBackdropClick}>
    <div className={styles.modal}>
      <div className={[styles.modalOverflow, className].join(' ')}>{children}</div>
      {isClosable && <ButtonIconXMark className={styles.buttonClose} onClick={onClose}/>}
    </div>
  </div>
}

export default ModalLayout
