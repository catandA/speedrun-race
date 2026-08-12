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
        <span class="ph-t">NO INPUT</span>
        <span>等待选手加入房间…</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-wrap {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 22px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
  margin-bottom: 6px;
}
.grid.has-fullscreen { display: block; }

.empty {
  grid-column: 1 / -1;
  display: flex; flex-direction: column; gap: 10px;
  align-items: center; justify-content: center;
  color: var(--fg-mute); font-size: 12px;
  padding: 52px 0;
}
.empty .ph-t { font-size: 13px; font-weight: 700; letter-spacing: 2px; color: var(--fg-mute); }
</style>
