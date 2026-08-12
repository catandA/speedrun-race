<script setup>
import { computed } from 'vue'

const props = defineProps({
  judgeMode: String,
  count: Number
})
const emit = defineEmits(['toggleMode'])

const hint = computed(() => {
  const modeTxt = props.judgeMode === 'all'
    ? '全览模式 · 拉全部选手小流(省流量), 点格子全屏单看'
    : '专注模式 · 只拉当前关注选手大流(最清晰, 最省时长)'
  const bill = props.judgeMode === 'all'
    ? '全览拉 8 路小流 ≈ 专注拉 1 路大流'
    : '当前最省时长包'
  return modeTxt + '。 计费按实际订阅路数和分辨率, ' + bill + '。'
})
const btnText = computed(() =>
  props.judgeMode === 'all' ? '全览 → 专注' : '专注 → 全览'
)
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <h2>裁判控制台</h2>
      <span class="count" v-if="count">在线 {{ count }}</span>
      <button class="btn ghost sm" @click="emit('toggleMode')">{{ btnText }}</button>
    </div>
    <p class="hint">{{ hint }}</p>
  </section>
</template>

<style scoped>
.panel-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.panel-head h2 { font-size: 15px; font-weight: 600; }
.count { font-size: 12px; color: var(--ok); background: rgba(52,211,153,0.12); padding: 3px 9px; border-radius: 20px; }
.hint { font-size: 12.5px; color: var(--fg-dim); line-height: 1.7; }
</style>
