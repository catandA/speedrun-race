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
      <span class="title">RUN LOG</span>
      <span class="count" v-if="logs.length">{{ logs.length }}</span>
      <span class="spacer"></span>
      <button v-if="logs.length" class="clear" @click="clear" title="清空日志">CLEAR</button>
    </div>
    <div class="log-body" ref="el">
      <div v-for="(l, i) in logs" :key="i" class="log-line">
        <span class="log-time">{{ l.t }}</span>
        <span class="log-msg">{{ l.msg }}</span>
      </div>
      <div v-if="!logs.length" class="log-empty">运行日志将显示在这里<span class="cur">_</span></div>
    </div>
  </div>
</template>

<style scoped>
.log-card {
  max-width: 980px;
  margin: 0 auto 20px;
  padding: 0 22px;
}
.log-card > * { box-sizing: border-box; }

.log-head {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: var(--radius) var(--radius) 0 0;
}
.title {
  font-size: 10px; font-weight: 700; letter-spacing: 1px;
  color: var(--fg-dim);
}
.count {
  font-size: 10px; font-weight: 700; color: var(--go);
  background: var(--go-dim); padding: 1px 7px; border-radius: var(--radius-sm); border: 1px solid var(--border-acc);
}
.spacer { flex: 1; }
.clear {
  font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
  color: var(--fg-mute);
  background: transparent; border: 1px solid var(--border); cursor: pointer;
  padding: 2px 7px; border-radius: var(--radius-sm);
  transition: color 0.1s, border-color 0.1s;
}
.clear:hover { color: var(--bad); border-color: var(--bad); }

.log-body {
  background: var(--inset);
  border: 1px solid var(--border);
  border-radius: 0 0 var(--radius) var(--radius);
  padding: 9px 12px;
  font-size: 12px;
  color: var(--fg-dim);
  max-height: 170px;
  overflow: auto;
  line-height: 1.65;
}
.log-line { display: flex; gap: 10px; padding: 1px 0; }
.log-time { color: var(--fg-mute); flex-shrink: 0; }
.log-msg { white-space: pre-wrap; word-break: break-all; }
.log-empty { color: var(--fg-mute); }
/* 终端光标 */
.cur { color: var(--go); animation: cur-blink 1s steps(2) infinite; }
@keyframes cur-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .cur { animation: none; } }
</style>
