<script setup>
defineProps({
  room: String,
  role: String,
  statusText: String,
  statusCls: String,
  joined: Boolean
})
defineEmits(['leave'])
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <span class="logo">🎮</span>
      <h1>速通比赛直播间</h1>
    </div>
    <div class="tags" v-if="joined">
      <span class="tag">{{ room }}</span>
      <span class="tag">{{ role }}</span>
    </div>
    <div class="status">
      <span class="dot" :class="statusCls"></span>
      <span class="status-text">{{ statusText }}</span>
    </div>
    <div class="spacer"></div>
    <button v-if="joined" class="btn ghost sm" @click="$emit('leave')">退出房间</button>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 12px 22px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(8px);
}
.brand { display: flex; align-items: center; gap: 10px; }
.logo { font-size: 20px; }
.topbar h1 { font-size: 17px; font-weight: 600; letter-spacing: 0.3px; }
.tags { display: flex; gap: 8px; }
.tag {
  font-size: 12px;
  color: var(--fg-dim);
  background: var(--panel-2);
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--line-soft);
}
.status { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--fg-dim); }
.dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--fg-mute);
  box-shadow: 0 0 0 3px rgba(255,255,255,0.04);
}
.dot.on { background: var(--ok); box-shadow: 0 0 8px rgba(52,211,153,0.6); }
.dot.off { background: var(--bad); }
.dot.mid { background: var(--warn); }
.dot.warn { background: var(--warn); animation: pulse 1.2s infinite; }
@keyframes pulse { 50% { opacity: 0.4; } }
.spacer { flex: 1; }
</style>
