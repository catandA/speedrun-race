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
      <span class="mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M13.5 1 4 13.2c-.5.6-.1 1.5.7 1.5H11l-1.6 7.7c-.2.9.9 1.4 1.4.7L20 10.9c.5-.6.1-1.5-.7-1.5H13l.5-7.4c.1-.8-.8-1.3-1.3-.6z"/></svg>
      </span>
      <div class="wordmark">
        <h1>SPEEDRUN<span class="accent">RACE</span></h1>
        <span class="sub">速通比赛直播间 / LIVE CONSOLE</span>
      </div>
    </div>

    <div class="tags" v-if="joined">
      <span class="tag"><span class="k">ROOM</span>{{ room.replace('房间: ', '') }}</span>
      <span class="tag"><span class="k">ID</span>{{ role.replace('角色: ', '') }}</span>
    </div>

    <div class="spacer"></div>

    <span class="live-tag hd-status" :class="statusCls || 'bad'">
      <span class="dot"></span>{{ statusText }}
    </span>

    <button v-if="joined" class="btn ghost sm leave" @click="$emit('leave')">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
      退出
    </button>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 20px;
  background: var(--bg-1);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 30;
}

.brand { display: flex; align-items: center; gap: 11px; }
/* 闪电标识: 速通的灵魂符号, 绿底带一点信号辉光 */
.mark {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  background: var(--go);
  color: #04140a;
  border-radius: var(--radius);
  box-shadow: 0 0 18px -6px var(--go);
  flex-shrink: 0;
}
.wordmark { display: flex; flex-direction: column; line-height: 1.05; }
.wordmark h1 {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--fg);
  white-space: nowrap;
}
.wordmark h1 .accent { color: var(--go); margin-left: 3px; }
.wordmark .sub { font-size: 9.5px; color: var(--fg-mute); letter-spacing: 1px; margin-top: 2px; }

.tags { display: flex; gap: 7px; flex-wrap: wrap; }
.spacer { flex: 1; }

/* 顶栏状态徽章略放大, go 态带辉光强调"在直播" */
.hd-status { font-size: 12px; padding: 4px 11px; }
.hd-status.go { box-shadow: 0 0 16px -6px var(--go); }

.leave { color: var(--fg-dim); }
</style>
