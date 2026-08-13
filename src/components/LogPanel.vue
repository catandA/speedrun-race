<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { useLog } from '../composables/useLog'

const props = defineProps({
  variant: { type: String, default: 'bottom' }   // 'sidebar' | 'bottom'
})
const { logs, clear } = useLog()
const el = ref(null)
const expanded = ref(false)
const latest = computed(() => logs.length ? logs[logs.length - 1] : null)

watch(() => logs.length, async () => {
  // 侧栏形态(裁判): 有新日志自动展开, 裁判需实时感知选手进退房/警告
  if (logs.length && !expanded.value && props.variant === 'sidebar') {
    expanded.value = true
  }
  if (expanded.value) {
    await nextTick()
    if (el.value) el.value.scrollTop = el.value.scrollHeight
  }
})

function toggle() { expanded.value = !expanded.value }
</script>

<template>
  <div class="log-card" :class="variant">
    <div class="log-head" @click="toggle">
      <span class="title">RUN LOG</span>
      <span class="count" v-if="logs.length">{{ logs.length }}</span>
      <!-- 折叠时单行预览最新一条, 不必展开也能看到关键信息 -->
      <span class="latest" v-if="!expanded && latest" :title="latest.msg">
        <span class="log-time">{{ latest.t }}</span>
        <span class="latest-msg">{{ latest.msg }}</span>
      </span>
      <span class="spacer"></span>
      <button v-if="logs.length" class="clear" @click.stop="clear" title="清空日志">CLEAR</button>
      <button class="toggle" :title="expanded ? '收起' : '展开日志'">{{ expanded ? '▾' : '▸' }}</button>
    </div>
    <div class="log-body" ref="el" v-show="expanded">
      <div v-for="(l, i) in logs" :key="i" class="log-line">
        <span class="log-time">{{ l.t }}</span>
        <span class="log-msg">{{ l.msg }}</span>
      </div>
      <div v-if="!logs.length" class="log-empty">运行日志将显示在这里<span class="cur">_</span></div>
    </div>
  </div>
</template>

<style scoped>
.log-card { box-sizing: border-box; }

/* bottom 形态: 居中限宽 (选手/未进房) */
.log-card.bottom {
  max-width: 980px;
  margin: 0 auto var(--space-xl);
  padding: 0 var(--space-xl);
}
/* sidebar 形态: 融入侧栏, 满宽无 padding (裁判) */
.log-card.sidebar {
  margin: 0;
  padding: 0;
}

.log-head {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: var(--radius) var(--radius) 0 0;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}
.log-head:hover { background: var(--surface-3); }
.title {
  font-size: 10px; font-weight: 700; letter-spacing: 1px;
  color: var(--fg-dim);
  flex-shrink: 0;
}
.count {
  font-size: 10px; font-weight: 700; color: var(--go);
  background: var(--go-dim); padding: 1px 7px; border-radius: var(--radius-sm); border: 1px solid var(--border-acc);
  flex-shrink: 0;
}
.latest {
  display: flex; gap: var(--space-sm); align-items: center;
  min-width: 0; overflow: hidden;
  font-size: 11px; color: var(--fg-dim);
}
.latest .log-time { color: var(--fg-mute); flex-shrink: 0; }
.latest-msg {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.spacer { flex: 1; }
.clear {
  font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
  color: var(--fg-mute);
  background: transparent; border: 1px solid var(--border); cursor: pointer;
  padding: 2px 7px; border-radius: var(--radius-sm);
  transition: color 0.1s, border-color 0.1s;
  flex-shrink: 0;
}
.clear:hover { color: var(--bad); border-color: var(--bad); }
.toggle {
  background: transparent; border: none; cursor: pointer;
  color: var(--fg-dim); font-size: 12px; padding: 2px 4px;
  flex-shrink: 0;
}
.toggle:hover { color: var(--go); }

.log-body {
  background: var(--inset);
  border: 1px solid var(--border);
  border-radius: 0 0 var(--radius) var(--radius);
  padding: var(--space-sm) var(--space-md);
  font-size: 12px;
  color: var(--fg-dim);
  overflow: auto;
  line-height: 1.65;
}
.log-card.bottom .log-body { max-height: 170px; }
.log-card.sidebar .log-body { max-height: 260px; }

.log-line { display: flex; gap: var(--space-sm); padding: 1px 0; }
.log-time { color: var(--fg-mute); flex-shrink: 0; }
.log-msg { white-space: pre-wrap; word-break: break-all; }
.log-empty { color: var(--fg-mute); }
.cur { color: var(--go); animation: cur-blink 1s steps(2) infinite; }
@keyframes cur-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .cur { animation: none; } }

/* sidebar 形态窄屏: 日志高度收紧 */
@media (max-width: 900px) {
  .log-card.sidebar .log-body { max-height: 180px; }
}
</style>
