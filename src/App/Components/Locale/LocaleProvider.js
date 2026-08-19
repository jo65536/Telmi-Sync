import { useCallback, useState } from 'react'
import LocaleContext from './LocaleContext.js'
import * as locales from '../../../Locales/Locales.js'
import { printf } from '../../Helpers/String.js'

const
  LANG_STORAGE_KEY = 'telmi-sync-lang',
  getDefaultLang = () => {
    try {
      const storedLang = window.localStorage.getItem(LANG_STORAGE_KEY)
      if (storedLang !== null && locales[storedLang] !== undefined) {
        return storedLang
      }
    } catch (ignored) {
    }
    const osLang = (window.navigator.language || 'fr').substring(0, 2).toLowerCase()
    return locales[osLang] !== undefined ? osLang : 'en'
  }

function LocaleProvider ({children}) {
  const
    [lang, setLangState] = useState(getDefaultLang),
    setLang = useCallback(
      (newLang) => {
        if (locales[newLang] === undefined) {
          return
        }
        try {
          window.localStorage.setItem(LANG_STORAGE_KEY, newLang)
        } catch (ignored) {
        }
        setLangState(newLang)
      },
      [setLangState]
    ),
    getLocale = useCallback(
      (string, ...args) => (locales[lang] !== undefined && locales[lang][string]) ? printf(locales[lang][string], ...args) : string,
      [lang]
    )

  return <LocaleContext.Provider value={{lang, setLang, getLocale}}>{children}</LocaleContext.Provider>
}

export default LocaleProvider
