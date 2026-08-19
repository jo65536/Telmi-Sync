import { useCallback, useEffect, useRef } from 'react'
import ButtonIconXMark from '../Buttons/Icons/ButtonIconXMark.js'

import styles from './Modal.module.scss'

const modalStack = []

function ModalLayout ({className, children, isClosable, onClose}) {
  const
    stackEntry = useRef({}),
    backdropMouseDown = useRef(false),
    onBackdropMouseDown = useCallback(
      (e) => {
        backdropMouseDown.current = e.target === e.currentTarget
      },
      []
    ),
    onBackdropClick = useCallback(
      (e) => {
        if (isClosable && typeof onClose === 'function' && e.target === e.currentTarget && backdropMouseDown.current) {
          onClose()
        }
        backdropMouseDown.current = false
      },
      [isClosable, onClose]
    )

  useEffect(
    () => {
      const entry = stackEntry.current
      modalStack.push(entry)
      return () => {
        const i = modalStack.indexOf(entry)
        if (i !== -1) {
          modalStack.splice(i, 1)
        }
      }
    },
    []
  )

  useEffect(
    () => {
      if (!isClosable || typeof onClose !== 'function') {
        return
      }
      const onKeyDown = (e) => {
        if (e.key === 'Escape' && modalStack[modalStack.length - 1] === stackEntry.current) {
          onClose()
        }
      }
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    },
    [isClosable, onClose]
  )

  return <div className={styles.container} onMouseDown={onBackdropMouseDown} onClick={onBackdropClick}>
    <div className={styles.modal}>
      <div className={[styles.modalOverflow, className].join(' ')}>{children}</div>
      {isClosable && <ButtonIconXMark className={styles.buttonClose} onClick={onClose}/>}
    </div>
  </div>
}

export default ModalLayout
