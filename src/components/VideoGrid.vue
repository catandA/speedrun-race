<script setup>
import { computed } from 'vue'
import { useTrtc } from '../composables/useTrtc'
import VideoTile from './VideoTile.vue'

const { tiles, tileClick, toggleMute } = useTrtc()

// reactive 对象转数组, 全屏优先显示
const list = computed(() => Object.values(tiles))
</script>

<template>
  <div class="grid-wrap">
    <div class="grid" :class="{ 'has-fullscreen': list.some(t => t.fullscreen) }">
      <VideoTile
        v-for="t in list"
        :key="t.uid"
        :tile="t"
        @click="tileClick"
        @mute="toggleMute"
      />
      <div v-if="!list.length" class="empty">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 2"/></svg>
        <span>等待选手加入房间…</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-wrap {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 24px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 14px;
  margin-bottom: 8px;
}
.grid.has-fullscreen { display: block; }

.empty {
  grid-column: 1 / -1;
  display: flex; flex-direction: column; gap: 12px;
  align-items: center; justify-content: center;
  color: var(--fg-mute); font-size: 13px;
  padding: 56px 0;
}
.empty svg { opacity: 0.5; }
</style>
