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
        <span class="mark">JC</span>
        <div>
          <h2>裁判控制台</h2>
          <p class="subtitle">实时监控全部选手画面</p>
        </div>
      </div>
      <div class="stats">
        <span class="live-tag go" v-if="count"><span class="dot"></span>在线 {{ count }}</span>
        <span class="live-tag split" v-if="focused"><span class="dot"></span>大流聚焦</span>
      </div>
    </header>
    <p class="hint">
      点击选手 = 全屏看大流(最清晰), 再次点击 = 缩回网格看全部小流。
      <span class="kbd-hint">键盘: 数字键 1-9 聚焦 / ESC 退出 / 空格静音聚焦</span>
    </p>
  </section>
</template>

<style scoped>
.jc-panel { max-width: 1180px; padding: 16px 22px; }

.jc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.title-wrap { display: flex; align-items: center; gap: 10px; }
.mark {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  background: var(--go); color: #04140a;
  font-weight: 800; font-size: 12px;
  border-radius: var(--radius);
}
.jc-head h2 { font-size: 15px; font-weight: 700; letter-spacing: 0.4px; }
.subtitle { font-size: 11px; color: var(--fg-mute); margin-top: 2px; }

.stats { margin-left: auto; display: flex; gap: 7px; align-items: center; }
.hint { font-size: 11.5px; color: var(--fg-dim); line-height: 1.8; }
.kbd-hint { color: var(--go); margin-left: 6px; }
</style>
