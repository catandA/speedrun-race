<script setup>
defineProps({
  count: Number,
  focused: Boolean
})
</script>

<template>
  <section class="panel jc-panel">
    <header class="jc-head">
      <div class="title-wrap">
        <span class="ic" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
        </span>
        <div>
          <h2>裁判控制台</h2>
          <p class="subtitle">实时监控全部选手画面</p>
        </div>
      </div>
      <div class="stats">
        <span class="stat" v-if="count">
          <span class="stat-dot"></span> 在线 {{ count }}
        </span>
        <span class="mode-tag" v-if="focused">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          大流聚焦
        </span>
      </div>
    </header>
    <p class="hint">
      点击任意选手 = 全屏看大流 (最清晰), 再次点击 = 缩回网格看全部小流。所有选手始终保持小流订阅, 切换零延迟。
    </p>
  </section>
</template>

<style scoped>
.jc-panel { max-width: 1180px; padding: 18px 24px; }

.jc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.title-wrap { display: flex; align-items: center; gap: 11px; }
.ic {
  display: grid; place-items: center;
  width: 34px; height: 34px; border-radius: 10px;
  background: var(--acc-soft); color: var(--acc);
  border: 1px solid var(--border-acc);
}
.jc-head h2 { font-size: 16px; font-weight: 700; }
.subtitle { font-size: 12px; color: var(--fg-mute); margin-top: 1px; }

.stats { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.stat {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 12px; font-weight: 600; color: var(--ok);
  background: rgba(52,211,153,0.12); border: 1px solid rgba(52,211,153,0.28);
  padding: 4px 11px; border-radius: 20px;
}
.stat-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 8px var(--ok); }
.mode-tag {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; color: var(--acc);
  background: var(--acc-soft); border: 1px solid var(--border-acc);
  padding: 4px 11px; border-radius: 20px;
}
.hint { font-size: 12.5px; color: var(--fg-dim); line-height: 1.7; }
</style>
