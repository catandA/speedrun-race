import { reactive, ref } from 'vue'

// 全局日志, reactive 数组驱动 LogPanel 渲染
const logs = reactive([])
const MAX = 300

export function useLog() {
  function log(msg) {
    const t = new Date().toTimeString().slice(0, 8)
    logs.push({ t, msg })
    if (logs.length > MAX) logs.splice(0, logs.length - MAX)
    // eslint-disable-next-line no-console
    console.log('[' + t + '] ' + msg)
  }
  function clear() { logs.splice(0, logs.length) }
  return { logs, log, clear }
}
