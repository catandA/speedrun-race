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
      <div class="ic">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></svg>
      </div>
      <h3>启用声音</h3>
      <p>浏览器自动播放策略阻止了音频, 点击任意处以启用声音播放。</p>
      <button class="btn primary" @click.stop="dismiss">点击启用</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 5, 11, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
  cursor: pointer;
}
.card {
  text-align: center;
  padding: 34px 38px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  max-width: 340px;
  animation: rise 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes rise { from { opacity: 0; transform: translateY(14px) scale(0.97); } }
.ic {
  display: grid; place-items: center;
  width: 58px; height: 58px; margin: 0 auto 16px;
  border-radius: 16px;
  background: var(--acc-grad);
  color: #05121f;
  box-shadow: 0 8px 24px var(--acc-glow), inset 0 1px 0 rgba(255,255,255,0.35);
}
.card h3 { font-size: 17px; font-weight: 700; margin-bottom: 7px; }
.card p { font-size: 12.5px; color: var(--fg-dim); line-height: 1.7; margin-bottom: 20px; }
.card .btn { width: 100%; }
</style>
