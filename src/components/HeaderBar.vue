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
      <span class="logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
          <path d="M13 2 4.5 13.2a.8.8 0 0 0 .63 1.3H10l-1.4 7.1a.45.45 0 0 0 .8.4L19 10.8a.8.8 0 0 0-.63-1.3H13z"
                fill="#05121f"/>
        </svg>
      </span>
      <div class="wordmark">
        <h1>SPEEDRUN RACE</h1>
        <span class="sub">速通比赛直播间</span>
      </div>
    </div>

    <div class="tags" v-if="joined">
      <span class="chip"><span class="k">房间</span>{{ room.replace('房间: ', '') }}</span>
      <span class="chip"><span class="k">身份</span>{{ role.replace('角色: ', '') }}</span>
    </div>

    <div class="spacer"></div>

    <div class="status" :class="statusCls">
      <span class="dot"></span>
      <span class="status-text">{{ statusText }}</span>
    </div>

    <button v-if="joined" class="btn ghost sm leave" @click="$emit('leave')">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
      </svg>
      退出房间
    </button>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 22px;
  background: rgba(9, 12, 22, 0.72);
  backdrop-filter: saturate(150%) blur(16px);
  -webkit-backdrop-filter: saturate(150%) blur(16px);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 30;
}
.topbar::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border-acc), transparent);
  opacity: 0.7;
}

.brand { display: flex; align-items: center; gap: 11px; }
.logo {
  display: grid;
  place-items: center;
  width: 34px; height: 34px;
  border-radius: 10px;
  background: var(--acc-grad);
  box-shadow: 0 6px 18px var(--acc-glow), inset 0 1px 0 rgba(255,255,255,0.35);
}
.wordmark { display: flex; flex-direction: column; line-height: 1.15; }
.wordmark h1 {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1.4px;
  background: var(--acc-grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.wordmark .sub { font-size: 11px; color: var(--fg-mute); letter-spacing: 0.6px; }

.tags { display: flex; gap: 8px; flex-wrap: wrap; }

.spacer { flex: 1; }

.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--fg-dim);
  background: var(--surface-2);
  border: 1px solid var(--border);
  padding: 5px 12px;
  border-radius: 20px;
}
.dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--fg-mute);
  box-shadow: 0 0 0 3px rgba(255,255,255,0.04);
  transition: background 0.2s, box-shadow 0.2s;
}
.status.on .dot { background: var(--ok); box-shadow: 0 0 10px rgba(52,211,153,0.7); }
.status.off .dot { background: var(--bad); box-shadow: 0 0 8px rgba(251,113,133,0.6); }
.status.mid .dot { background: var(--warn); }
.status.warn .dot { background: var(--warn); animation: pulse 1.2s infinite; }
.status.on { color: var(--ok); border-color: rgba(52,211,153,0.3); }
.status.off { color: var(--bad); border-color: rgba(251,113,133,0.3); }
.status.mid, .status.warn { color: var(--warn); border-color: rgba(251,191,36,0.3); }
@keyframes pulse { 50% { opacity: 0.35; } }

.leave { color: var(--fg-dim); }
</style>
