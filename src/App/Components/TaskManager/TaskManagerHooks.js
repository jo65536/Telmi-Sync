import { useContext } from 'react'
import TaskManagerContext from './TaskManagerContext.js'

const useTaskManager = () => useContext(TaskManagerContext)

export { useTaskManager }
