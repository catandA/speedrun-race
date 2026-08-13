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
      v-for="(t, i) in list"
      :key="t.uid"
      :tile="t"
      :style="{ '--i': i }"
      class="stagger"
      @click="tileClick"
      @mute="toggleMute"
    />
    <div v-if="!list.length" class="empty">
      <span class="ph-t">NO INPUT</span>
      <span>等待选手加入房间…</span>
    </div>
  </div>
</template>

<style scoped>
/* 主区纯网格: 去掉外层 max-width/padding, 由 .main-area 容器管 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: var(--space-md);
}
.grid.has-fullscreen { display: block; }

.empty {
  grid-column: 1 / -1;
  display: flex; flex-direction: column; gap: var(--space-sm);
  align-items: center; justify-content: center;
  color: var(--fg-mute); font-size: 13px;
  padding: var(--space-4xl) 0;
  background: linear-gradient(180deg, var(--surface-2), var(--surface));
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}
.empty .ph-t { font-family: var(--font-mono); font-size: 13px; font-weight: 700; letter-spacing: 2px; color: var(--fg-mute); }
</style>
