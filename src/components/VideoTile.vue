<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useTrtc } from '../composables/useTrtc'

const props = defineProps({ tile: Object })
const emit = defineEmits(['click', 'mute'])

const { retrySubscribe } = useTrtc()
const videoRef = ref(null)

const isOffline = computed(() => props.tile.status === 'offline')
const isLive = computed(() => props.tile.status === 'live')

onMounted(() => {
  // 把视频容器 DOM 注入 tile, 供 TRTC startRemoteVideo 的 view 使用
  props.tile.videoEl = videoRef.value
  // 容器就绪后, 若该 tile 已在等待订阅, 触发一次订阅
  retrySubscribe(props.tile.uid)
})

onBeforeUnmount(() => {
  props.tile.videoEl = null
})
</script>

<template>
  <div
    class="tile"
    :class="{ waiting: !isLive && !isOffline, offline: isOffline, live: isLive, fullscreen: tile.fullscreen }"
    @click="emit('click', tile)"
  >
    <div class="video" ref="videoRef"></div>

    <div class="topbar">
      <span class="live-badge" v-if="isLive">
        <span class="live-dot"></span> LIVE
      </span>
      <span class="focused-tag" v-if="tile.fullscreen">大流</span>
      <span class="empty-grow"></span>
      <button class="mute-btn" :class="{ muted: tile.muted }" @click.stop="emit('mute', tile)" :title="tile.muted ? '取消静音' : '静音'">
        <svg v-if="tile.muted" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4zM23 9l-6 6M17 9l6 6"/></svg>
        <svg v-else viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></svg>
      </button>
    </div>

    <div v-if="!isLive && !isOffline" class="placeholder">
      <div class="ph-ic">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>
      </div>
      <span class="ph-name">{{ tile.uid }}</span>
      <span class="sub">等待推流…</span>
    </div>

    <div v-if="isOffline" class="placeholder">
      <div class="ph-ic off">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M4 4l16 16"/></svg>
      </div>
      <span class="ph-name">{{ tile.uid }}</span>
      <span class="sub off-sub">已离开</span>
    </div>

    <div class="meta">
      <span class="name">{{ tile.uid }}</span>
      <span class="st">{{ tile.statusText }}</span>
    </div>
  </div>
</template>

<style scoped>
.tile {
  position: relative;
  background: var(--inset);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  overflow: hidden;
  aspect-ratio: 16 / 9;
  cursor: pointer;
  transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
}
.tile:hover { border-color: var(--border-acc); transform: translateY(-3px); box-shadow: var(--shadow); }
.tile.live { border-color: rgba(52,211,153,0.35); }
.tile.fullscreen { position: fixed; inset: 0; z-index: 50; border-radius: 0; aspect-ratio: auto; border: none; }
.tile.fullscreen:hover { transform: none; }

.video { width: 100%; height: 100%; }
.video :deep(video) { width: 100%; height: 100%; object-fit: contain; background: #000; }

/* 顶部条: LIVE / 聚焦 / 静音 */
.topbar {
  position: absolute; top: 9px; left: 9px; right: 9px;
  display: flex; align-items: center; gap: 7px;
  z-index: 3;
}
.empty-grow { flex: 1; }
.live-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
  color: #fff;
  background: linear-gradient(135deg, #fb7185, #f43f5e);
  padding: 3px 8px; border-radius: 6px;
  box-shadow: 0 2px 8px rgba(244,63,94,0.4);
}
.live-dot { width: 5px; height: 5px; border-radius: 50%; background: #fff; animation: pulse 1.2s infinite; }
.focused-tag {
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
  color: var(--acc);
  background: var(--acc-soft); border: 1px solid var(--border-acc);
  padding: 2px 7px; border-radius: 5px;
}
@keyframes pulse { 50% { opacity: 0.35; } }

.mute-btn {
  display: grid; place-items: center;
  width: 26px; height: 26px;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  border-radius: 7px; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.mute-btn:hover { background: rgba(0,0,0,0.78); }
.mute-btn.muted { background: rgba(244,63,94,0.78); border-color: rgba(255,255,255,0.2); }

/* 占位状态 */
.placeholder {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; gap: 6px;
  align-items: center; justify-content: center;
  color: var(--fg-mute);
}
.ph-ic {
  display: grid; place-items: center;
  width: 46px; height: 46px; border-radius: 12px;
  background: var(--surface-2); color: var(--fg-mute);
  border: 1px solid var(--border);
  margin-bottom: 4px;
}
.ph-ic.off { color: var(--bad); }
.ph-name { font-size: 14px; font-weight: 600; color: var(--fg-dim); }
.sub { font-size: 11.5px; color: var(--fg-mute); }
.off-sub { color: var(--bad); }

/* 底部信息条 */
.meta {
  position: absolute; left: 0; right: 0; bottom: 0;
  display: flex; align-items: center; gap: 8px;
  padding: 16px 12px 8px;
  background: linear-gradient(transparent, rgba(0,0,0,0.85));
  font-size: 12px;
  pointer-events: none;
}
.meta .name { font-weight: 700; color: #fff; }
.meta .st { color: var(--fg-dim); font-size: 11px; margin-left: auto; }
</style>
