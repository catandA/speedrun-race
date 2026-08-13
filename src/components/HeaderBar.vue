<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
defineProps({
  room: String,
  role: String,
  statusText: String,
  statusCls: String,
  joined: Boolean
})
defineEmits(['leave'])

// 滚动后叠阴影, 让 sticky 顶栏与内容"浮起分离"有控制台感
const scrolled = ref(false)
function onScroll() { scrolled.value = window.scrollY > 4 }
onMounted(() => { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }) })
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="topbar" :class="{ scrolled }">
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

    <button v-if="joined" class="btn ghost sm leave" @click="$emit('leave')" aria-label="退出房间">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
      退出
    </button>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-sm) var(--space-xl);
  min-height: var(--topbar-h);
  background: rgba(7, 8, 12, 0.72);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  transition: box-shadow 0.2s var(--ease-out-quart), border-color 0.2s;
}
/* 滚动后: 阴影浮起 + 描边加深, 与内容分离 */
.topbar.scrolled {
  box-shadow: 0 6px 20px -8px rgba(0, 0, 0, 0.6);
  border-bottom-color: var(--border-strong);
}

.brand { display: flex; align-items: center; gap: var(--space-md); }
/* 闪电标识: 渐变方块 + 克制辉光 (品牌点睛) */
.mark {
  display: grid; place-items: center;
  width: 34px; height: 34px;
  background: linear-gradient(160deg, var(--go-soft), var(--go));
  color: #04140a;
  border-radius: var(--radius);
  box-shadow: 0 4px 14px -4px rgba(61, 245, 138, 0.45), 0 1px 0 0 rgba(255, 255, 255, 0.25) inset;
  flex-shrink: 0;
}
.wordmark { display: flex; flex-direction: column; line-height: 1.1; }
.wordmark h1 {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: var(--fg);
  white-space: nowrap;
}
.wordmark h1 .accent {
  background: linear-gradient(90deg, var(--go-soft), var(--go));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-left: 3px;
}
.wordmark .sub { font-size: 9.5px; color: var(--fg-mute); letter-spacing: 1.4px; margin-top: 2px; font-family: var(--font-mono); }

.tags { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
.spacer { flex: 1; }

/* 顶栏状态徽章: go 态带辉光强调"在直播" */
.hd-status { font-size: 12px; padding: 4px 11px; }
.hd-status.go { box-shadow: 0 0 0 1px var(--go), 0 0 18px -6px var(--go); }

.leave { color: var(--fg-dim); }
</style>
