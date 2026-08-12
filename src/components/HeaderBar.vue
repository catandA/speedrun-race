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
      <span class="mark">SR</span>
      <div class="wordmark">
        <h1>SPEEDRUN RACE</h1>
        <span class="sub">速通比赛直播间</span>
      </div>
    </div>

    <div class="tags" v-if="joined">
      <span class="tag"><span class="k">ROOM</span>{{ room.replace('房间: ', '') }}</span>
      <span class="tag"><span class="k">ID</span>{{ role.replace('角色: ', '') }}</span>
    </div>

    <div class="spacer"></div>

    <span class="live-tag" :class="statusCls || 'bad'">
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

.brand { display: flex; align-items: center; gap: 10px; }
/* SR 标识: 方块字标, 不用渐变不用发光 */
.mark {
  display: grid; place-items: center;
  width: 30px; height: 30px;
  background: var(--go);
  color: #04140a;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.5px;
  border-radius: var(--radius);
}
.wordmark { display: flex; flex-direction: column; line-height: 1.1; }
.wordmark h1 {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: var(--fg);
}
.wordmark .sub { font-size: 10px; color: var(--fg-mute); letter-spacing: 0.8px; }

.tags { display: flex; gap: 7px; flex-wrap: wrap; }
.spacer { flex: 1; }

.leave { color: var(--fg-dim); }
</style>
