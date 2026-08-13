<script setup>
defineProps({
  count: Number,
  focused: Boolean
})
</script>

<template>
  <div class="sidebar-block jc-side">
    <header class="jc-head">
      <span class="mark">JC</span>
      <div class="title-wrap">
        <h2>裁判控制台</h2>
        <p class="subtitle">实时监控全部选手</p>
      </div>
    </header>

    <div class="stats">
      <span class="live-tag go" v-if="count"><span class="dot"></span>在线 {{ count }}</span>
      <span class="live-tag split" v-if="focused"><span class="dot"></span>大流聚焦</span>
      <span class="live-tag bad" v-if="!count"><span class="dot"></span>无信号</span>
    </div>

    <div class="kbd-row">
      <span class="kbd-hint">数字键 1-9 聚焦 · ESC 退出 · 空格静音</span>
    </div>
    <p class="hint">点击选手全屏看大流(最清晰),再次点击缩回网格看全部小流。</p>
  </div>
</template>

<style scoped>
.jc-side { padding: var(--space-md) var(--space-lg); }

.jc-head { display: flex; align-items: center; gap: var(--space-sm); }
.mark {
  display: grid; place-items: center;
  width: 28px; height: 28px;
  background: var(--go); color: #04140a;
  font-weight: 800; font-size: 11px;
  border-radius: var(--radius);
  box-shadow: 0 0 14px -6px var(--go);
  flex-shrink: 0;
}
.title-wrap { display: flex; flex-direction: column; line-height: 1.15; }
.jc-head h2 { font-size: 13px; font-weight: 800; letter-spacing: 0.3px; }
.subtitle { font-size: 10px; color: var(--fg-mute); margin-top: 2px; }

.stats { display: flex; gap: var(--space-xs); flex-wrap: wrap; margin-top: var(--space-md); }
.stats .live-tag { font-size: 11px; padding: 3px 9px; }
.stats .live-tag.go { box-shadow: 0 0 14px -6px var(--go); }

.kbd-row {
  margin-top: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--inset);
  border: 1px solid var(--border);
  border-left: 2px solid var(--go);
  border-radius: var(--radius-sm);
}
.kbd-hint { font-size: 10.5px; color: var(--go); font-weight: 600; letter-spacing: 0.2px; }
.hint { font-size: 11px; color: var(--fg-mute); margin-top: var(--space-sm); line-height: 1.6; }
</style>
