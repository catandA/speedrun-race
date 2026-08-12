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
    :class="{ waiting: !isLive && !isOffline, offline: isOffline, live: isLive, fullscreen: tile.fullscreen, focused: tile.focused }"
    @click="emit('click', tile)"
  >
    <div class="video" ref="videoRef"></div>
    <div v-if="!isLive && !isOffline" class="placeholder">
      <span>{{ tile.uid }}</span>
      <span class="sub">等待推流…</span>
    </div>
    <div v-if="isOffline" class="placeholder">
      <span>{{ tile.uid }}</span>
      <span class="sub offline-sub">已离开</span>
    </div>
    <div class="meta">
      <span class="name">{{ tile.uid }}</span>
      <span class="st">{{ tile.statusText }}</span>
    </div>
    <button class="mute-btn" :class="{ muted: tile.muted }" @click.stop="emit('mute', tile)">
      {{ tile.muted ? '🔇' : '🔊' }}
    </button>
  </div>
</template>

<style scoped>
.tile {
  position: relative;
  background: #000;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  aspect-ratio: 16 / 9;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.tile:hover { border-color: var(--acc); transform: translateY(-2px); box-shadow: var(--shadow); }
.tile.focused { border-color: var(--acc); box-shadow: 0 0 0 2px var(--acc-soft); }
.tile.fullscreen { position: fixed; inset: 0; z-index: 50; border-radius: 0; aspect-ratio: auto; }
.video { width: 100%; height: 100%; }
.video :deep(video) { width: 100%; height: 100%; object-fit: contain; background: #000; }

.placeholder {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; gap: 4px;
  align-items: center; justify-content: center;
  color: var(--fg-mute); font-size: 14px; font-weight: 500;
}
.placeholder .sub { font-size: 12px; font-weight: 400; color: var(--fg-mute); }
.offline-sub { color: var(--bad); }

.meta {
  position: absolute; left: 0; right: 0; bottom: 0;
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  font-size: 12px;
}
.meta .name { font-weight: 600; color: #fff; }
.meta .st { color: var(--fg-dim); font-size: 11px; margin-left: auto; }

.mute-btn {
  position: absolute; top: 8px; right: 8px;
  background: rgba(0,0,0,0.55);
  border: none; color: #fff;
  border-radius: 6px; padding: 4px 9px; font-size: 12px; cursor: pointer;
  z-index: 3; transition: background 0.15s;
}
.mute-btn:hover { background: rgba(0,0,0,0.75); }
.mute-btn.muted { background: rgba(248,113,113,0.7); }
</style>
