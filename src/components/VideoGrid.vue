<script setup>
import { computed } from 'vue'
import { useTrtc } from '../composables/useTrtc'
import VideoTile from './VideoTile.vue'

const { tiles, tileClick, toggleMute } = useTrtc()

// reactive 对象转数组, 全屏优先显示
const list = computed(() => Object.values(tiles))
</script>

<template>
  <div class="grid" :class="{ 'has-fullscreen': list.some(t => t.fullscreen) }">
    <VideoTile
      v-for="t in list"
      :key="t.uid"
      :tile="t"
      @click="tileClick"
      @mute="toggleMute"
    />
    <div v-if="!list.length" class="empty">
      等待选手加入房间…
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  margin: 14px 18px;
}
.empty {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--fg-mute);
  font-size: 13px;
  padding: 50px 0;
}
</style>
