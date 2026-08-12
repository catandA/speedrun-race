<script setup>
import { ref, watch, nextTick } from 'vue'
import { useLog } from '../composables/useLog'

const { logs } = useLog()
const el = ref(null)
watch(() => logs.length, async () => {
  await nextTick()
  if (el.value) el.value.scrollTop = el.value.scrollHeight
})
</script>

<template>
  <div class="log-panel" ref="el">
    <div v-for="(l, i) in logs" :key="i" class="log-line">
      <span class="log-time">{{ l.t }}</span>
      <span class="log-msg">{{ l.msg }}</span>
    </div>
    <div v-if="!logs.length" class="log-empty">运行日志将显示在这里…</div>
  </div>
</template>

<style scoped>
.log-panel {
  margin: 0 18px 18px;
  font-size: 12px;
  color: var(--fg-dim);
  max-height: 170px;
  overflow: auto;
  background: var(--bg-elev);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  padding: 10px 12px;
  font-family: "JetBrains Mono", "Consolas", monospace;
}
.log-line { display: flex; gap: 8px; padding: 1px 0; }
.log-time { color: var(--fg-mute); flex-shrink: 0; }
.log-msg { white-space: pre-wrap; word-break: break-all; }
.log-empty { color: var(--fg-mute); }
</style>
