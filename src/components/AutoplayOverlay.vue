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
  <div v-if="visible" class="overlay" @click="dismiss">
    <div class="card">
      <span class="ic">♪</span>
      <h3>启用声音</h3>
      <p>浏览器自动播放策略阻止了音频, 点击任意处或按 ESC 启用。</p>
      <button class="btn primary" @click.stop="dismiss">点击启用</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 3, 5, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
  cursor: pointer;
}
.card {
  text-align: center;
  padding: 28px 32px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-top: 2px solid var(--go);
  border-radius: var(--radius);
  max-width: 320px;
}
.ic {
  display: grid; place-items: center;
  width: 44px; height: 44px; margin: 0 auto 14px;
  background: var(--go); color: #04140a;
  font-size: 22px; font-weight: 700;
  border-radius: var(--radius);
}
.card h3 { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.card p { font-size: 12px; color: var(--fg-dim); line-height: 1.7; margin-bottom: 16px; }
.card .btn { width: 100%; }
</style>
