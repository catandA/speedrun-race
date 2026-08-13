import { reactive } from 'vue'

// 全局瞬时反馈: 右上角 toast, 2.4s 自动消失
// 用于复制成功 / 进房成功 / 自动退房这类裁判盯视频时看不到日志的瞬时事件
const toasts = reactive([])
let seq = 0

function push(msg, type = 'ok', ms = 2400) {
  const id = ++seq
  toasts.push({ id, msg, type })
  setTimeout(() => {
    const i = toasts.findIndex(t => t.id === id)
    if (i >= 0) toasts.splice(i, 1)
  }, ms)
  return id
}

export function useToast() {
  return {
    toasts,
    ok: (m, ms) => push(m, 'ok', ms),
    warn: (m, ms) => push(m, 'warn', ms),
    bad: (m, ms) => push(m, 'bad', ms),
    dismiss: (id) => {
      const i = toasts.findIndex(t => t.id === id)
      if (i >= 0) toasts.splice(i, 1)
    }
  }
}
