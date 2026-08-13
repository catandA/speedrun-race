<script setup>
import { useToast } from '../composables/useToast'
const { toasts, dismiss } = useToast()
</script>

<template>
  <TransitionGroup tag="div" name="toast" class="toast-stack">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type" @click="dismiss(t.id)">
      <span class="ic" aria-hidden="true">{{ t.type === 'bad' ? '×' : t.type === 'warn' ? '!' : '✓' }}</span>
      <span class="msg">{{ t.msg }}</span>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: calc(var(--topbar-h) + var(--space-sm));
  right: var(--space-lg);
  z-index: var(--z-modal);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 200px;
  max-width: 320px;
  padding: 10px 14px;
  background: linear-gradient(180deg, var(--surface-2), var(--surface));
  border: 1px solid var(--border-strong);
  border-left: 2px solid var(--go);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--fg);
  pointer-events: auto;
  cursor: pointer;
}
.toast.warn { border-left-color: var(--split); }
.toast.bad { border-left-color: var(--bad); }
.ic {
  display: grid; place-items: center;
  width: 18px; height: 18px;
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 12px; font-weight: 800;
  border-radius: 50%;
  color: #04140a;
  background: var(--go);
}
.toast.warn .ic { background: var(--split); color: #1a1000; }
.toast.bad .ic { background: var(--bad); color: #2a0710; }
.msg { line-height: 1.4; }

/* 进出: 从右滑入, 离场淡出右移 */
.toast-enter-from { opacity: 0; transform: translateX(20px); }
.toast-leave-active { position: absolute; right: 0; transition: opacity 0.2s, transform 0.2s; }
.toast-leave-to { opacity: 0; transform: translateX(20px); }
.toast-enter-active { transition: opacity 0.22s var(--ease-out-expo), transform 0.22s var(--ease-out-expo); }
.toast-move { transition: transform 0.22s var(--ease-out-expo); }
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active, .toast-move { transition: opacity 0.15s; transform: none; }
}

@media (max-width: 540px) {
  .toast-stack { right: var(--space-sm); left: var(--space-sm); }
  .toast { max-width: none; }
}
</style>
