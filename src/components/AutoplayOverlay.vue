<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useTrtc } from '../composables/useTrtc'

const { trtc } = useTrtc()
const visible = ref(false)

function show() { visible.value = true }
function dismiss() {
  visible.value = false
  try { if (trtc.value && trtc.value.callExperimentalAPI) trtc.value.callExperimentalAPI('resumeAudio') } catch (x) {}
}
onMounted(() => window.addEventListener('autoplay-failed', show))
onUnmounted(() => window.removeEventListener('autoplay-failed', show))
</script>

<template>
  <div v-if="visible" class="overlay" @click="dismiss">🔊 点击任意处启用声音</div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
  font-size: 17px;
  cursor: pointer;
  color: var(--fg);
}
</style>
