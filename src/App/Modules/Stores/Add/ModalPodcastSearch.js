import {useCallback, useEffect, useRef, useState} from 'react'
import {useLocale} from '../../../Components/Locale/LocaleHooks.js'
import {useElectronListener} from '../../../Components/Electron/Hooks/UseElectronEvent.js'
import ModalLayoutPadded from '../../../Components/Modal/ModalLayoutPadded.js'
import ModalTitle from '../../../Components/Modal/ModalTitle.js'
import ModalContent from '../../../Components/Modal/ModalContent.js'
import ButtonsContainer from '../../../Components/Buttons/ButtonsContainer.js'
import ButtonText from '../../../Components/Buttons/Text/ButtonText.js'
import Loader from '../../../Components/Loader/Loader.js'

import styles from './StoreAdd.module.scss'

const {ipcRenderer} = window.require('electron')

function ModalPodcastSearch({onValidate, onManual, onClose}) {
  const
    {getLocale} = useLocale(),
    searchInput = useRef(),
    lastQuery = useRef(''),
    [results, setResults] = useState([]),
    [isSearching, setIsSearching] = useState(false),
    [hasSearched, setHasSearched] = useState(false),

    runSearch = useCallback(() => {
      const query = searchInput.current.value.trim()
      if (query.length < 2) {
        return
      }
      lastQuery.current = query
      setIsSearching(true)
      setHasSearched(true)
      ipcRenderer.send('podcast-search', query)
    }, []),

    onKeyUp = useCallback((e) => {
      if (e.key === 'Enter') {
        runSearch()
      }
    }, [runSearch])

  useElectronListener(
    'podcast-search-data',
    (data) => {
      if (data.query === lastQuery.current) {
        setResults(data.results)
        setIsSearching(false)
      }
    },
    []
  )

  useEffect(() => {
    if (searchInput.current) {
      searchInput.current.focus()
    }
  }, [])

  return <ModalLayoutPadded isClosable={true} onClose={onClose}>
    <ModalTitle>{getLocale('podcast-search')} :</ModalTitle>
    <ModalContent>
      <div className={styles.searchRow}>
        <input type="text"
               ref={searchInput}
               className={styles.searchInput}
               placeholder={getLocale('podcast-search-placeholder')}
               onKeyUp={onKeyUp}/>
        <ButtonText text={getLocale('search')} rounded={true} onClick={runSearch}/>
      </div>

      {isSearching && <Loader inline={true}/>}

      {
        !isSearching && hasSearched && results.length === 0 &&
        <p className={styles.searchEmpty}>{getLocale('podcast-search-empty')}</p>
      }

      {
        !isSearching && results.length > 0 &&
        <ul className={styles.searchResults}>{
          results.map((r, k) => <li key={'result-' + k}
                                    className={styles.searchResult}
                                    onClick={() => {
                                      onValidate({name: r.title, url: r.feedUrl, deletable: true})
                                      onClose()
                                    }}>
            {r.image ? <img src={r.image} className={styles.searchResultImage} alt=""/> : <span className={styles.searchResultImage}/>}
            <span className={styles.searchResultText}>
              <span className={styles.searchResultTitle} title={r.title}>{r.title}</span>
              <span className={styles.searchResultAuthor} title={r.author}>{r.author}</span>
            </span>
          </li>)
        }</ul>
      }
    </ModalContent>
    <ButtonsContainer>
      <ButtonText text={getLocale('store-add-manual')} onClick={() => { onClose(); onManual() }}/>
    </ButtonsContainer>
  </ModalLayoutPadded>
}

export default ModalPodcastSearch
