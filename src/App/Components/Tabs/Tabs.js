import { useState } from 'react'
import Tab from './Tab.js'

import styles from './Tabs.module.scss'

const tabId = (tab, i) => (tab && tab.id !== undefined) ? tab.id : 'tab-' + i

function Tabs ({className, tabs}) {
  const
    [currentId, setCurrentId] = useState(undefined),
    // Derive the active tab by stable id so replacing the tabs array (e.g. a
    // store added/removed rebuilds every tab object) keeps the selection
    // instead of snapping back to the first tab.
    effectiveId = tabs.some((t, i) => tabId(t, i) === currentId) ? currentId : tabId(tabs[0] || {}, 0),
    current = tabs.find((t, i) => tabId(t, i) === effectiveId) || {},
    DisplayedComponent = current.content

  return <div className={[className, styles.container].join(' ')}>
    <ul className={styles.tabs}>{
      tabs.map((tab, i) => (<Tab key={tabId(tab, i)}
                                 button={tab.tab}
                                 selected={tabId(tab, i) === effectiveId}
                                 onClick={() => setCurrentId(tabId(tab, i))}/>))
    }</ul>
    <div className={styles.content}>
      {DisplayedComponent && <DisplayedComponent/>}
    </div>
  </div>
}

export default Tabs
