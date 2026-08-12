<script setup>
import { ref, watch, nextTick } from 'vue'
import { useLog } from '../composables/useLog'

const { logs, clear } = useLog()
const el = ref(null)
watch(() => logs.length, async () => {
  await nextTick()
  if (el.value) el.value.scrollTop = el.value.scrollHeight
})
</script>

<template>
  <div class="log-card">
    <div class="log-head">
      <span class="title">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 17 6-6-6-6M12 19h8"/></svg>
        运行日志
      </span>
      <span class="count" v-if="logs.length">{{ logs.length }}</span>
      <span class="spacer"></span>
      <button v-if="logs.length" class="clear" @click="clear" title="清空日志">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        清空
      </button>
    </div>
    <div class="log-body" ref="el">
      <div v-for="(l, i) in logs" :key="i" class="log-line">
        <span class="log-time">{{ l.t }}</span>
        <span class="log-msg">{{ l.msg }}</span>
      </div>
      <div v-if="!logs.length" class="log-empty">运行日志将显示在这里…</div>
    </div>
  </div>
</template>

<style scoped>
.log-card {
  max-width: 980px;
  margin: 0 auto 22px;
  padding: 0 24px;
}
.log-card > * { box-sizing: border-box; }

.log-head {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  background: var(--surface);
  backdrop-filter: saturate(140%) blur(12px);
  -webkit-backdrop-filter: saturate(140%) blur(12px);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: var(--radius) var(--radius) 0 0;
}
.title {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 12px; font-weight: 600; letter-spacing: 0.4px;
  text-transform: uppercase; color: var(--fg-dim);
}
.title svg { color: var(--acc); }
.count {
  font-size: 11px; font-weight: 600; color: var(--acc);
  background: var(--acc-soft); padding: 1px 8px; border-radius: 20px;
}
.spacer { flex: 1; }
.clear {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11.5px; color: var(--fg-mute);
  background: transparent; border: none; cursor: pointer;
  padding: 3px 6px; border-radius: 5px;
  transition: color 0.15s, background 0.15s;
}
.clear:hover { color: var(--bad); background: rgba(251,113,133,0.1); }

.log-body {
  background: var(--inset);
  border: 1px solid var(--border);
  border-radius: 0 0 var(--radius) var(--radius);
  padding: 10px 14px;
  font-size: 12px;
  color: var(--fg-dim);
  max-height: 180px;
  overflow: auto;
  font-family: var(--font-mono);
  line-height: 1.65;
}
.log-line { display: flex; gap: 10px; padding: 1px 0; }
.log-time { color: var(--fg-mute); flex-shrink: 0; }
.log-msg { white-space: pre-wrap; word-break: break-all; }
.log-empty { color: var(--fg-mute); }
</style>
