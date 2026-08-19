import ModalContext from './ModalContext.js'
import { useMemo, useRef, useState } from 'react'

function ModalProvider ({children}) {
  const
    [modals, setModals] = useState([]),
    nextModalId = useRef(0),
    value = useMemo(
      () => ({
        // monotonic ids: length-derived keys collide once a modal is removed
        // while another stays open, confusing React's reconciliation
        addModal: modal => setModals(modals => [...modals, modal('modal-' + (nextModalId.current++))]),
        rmModal: modal => setModals(modals => modals.filter(m => m !== modal))
      }),
      [setModals]
    )

  return <ModalContext.Provider value={value}>
    {children}
    {modals}
  </ModalContext.Provider>
}

export default ModalProvider
