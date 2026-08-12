<script setup>
defineProps({
  count: Number,
  focused: Boolean
})
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <h2>裁判控制台</h2>
      <span class="count" v-if="count">在线 {{ count }}</span>
      <span class="mode-tag" v-if="focused">大流聚焦中</span>
    </div>
    <p class="hint">点击任意选手 = 全屏看大流(最清晰), 再次点击 = 缩回网格看全部小流。所有选手始终保持小流订阅, 切换零延迟。</p>
  </section>
</template>

<style scoped>
.panel-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.panel-head h2 { font-size: 15px; font-weight: 600; }
.count { font-size: 12px; color: var(--ok); background: rgba(52,211,153,0.12); padding: 3px 9px; border-radius: 20px; }
.mode-tag { font-size: 12px; color: var(--acc); background: var(--acc-soft); padding: 3px 9px; border-radius: 20px; }
.hint { font-size: 12.5px; color: var(--fg-dim); line-height: 1.7; }
</style>
