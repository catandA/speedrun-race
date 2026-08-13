<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useTrtc } from '../composables/useTrtc'

const props = defineProps({ tile: Object })
const emit = defineEmits(['click', 'mute'])

const { retrySubscribe, localStats } = useTrtc()
const videoRef = ref(null)

const isOffline = computed(() => props.tile.status === 'offline')
const isLive = computed(() => props.tile.status === 'live')

// 分辨率/帧率: Web SDK v5 不提供, 从 <video> 元素轮询读 videoWidth/videoHeight
const vRes = ref({ w: 0, h: 0 })
let pollTimer = null
function pollVideo() {
  const v = videoRef.value && videoRef.value.querySelector('video')
  if (v && v.videoWidth) vRes.value = { w: v.videoWidth, h: v.videoHeight }
}

// 拉流参数: 分辨率(从video元素读) + 下行平均网络质量(NETWORK_QUALITY, 裁判侧所有选手共用下行均值)
// Q0=没建立下行连接(没拉到流), 不显示; 只在直播中且 Q>0 或有分辨率时显示
const QMAP = ['', '极佳', '良好', '一般', '较差', '很差', '断开']
const statsText = computed(() => {
  if (!isLive.value) return ''   // 待机/离线不显示
  const s = localStats.value
  const res = (vRes.value.w && vRes.value.h) ? (vRes.value.w + '×' + vRes.value.h) : ''
  const q = (s && s.dnQ != null && s.dnQ > 0) ? QMAP[s.dnQ] : ''
  const loss = (s && s.dnLoss != null && s.dnQ > 0) ? '↓' + s.dnLoss + '%' : ''
  if (props.tile.fullscreen) {
    const rtt = (s && s.dnRtt != null && s.dnQ > 0) ? s.dnRtt + 'ms' : ''
    return [res, q, loss, rtt].filter(Boolean).join(' ')
  }
  return [res, q, loss].filter(Boolean).join(' · ')
})
const statsBad = computed(() => localStats.value && localStats.value.dnQ != null && localStats.value.dnQ >= 4)

onMounted(() => {
  props.tile.videoEl = videoRef.value
  retrySubscribe(props.tile.uid)
  pollTimer = setInterval(pollVideo, 1000)
})

onBeforeUnmount(() => {
  props.tile.videoEl = null
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div
    class="tile"
    :class="{ waiting: !isLive && !isOffline, offline: isOffline, live: isLive, fullscreen: tile.fullscreen }"
    role="button"
    tabindex="0"
    :aria-label="(tile.fullscreen ? '退出全屏: ' : '聚焦选手: ') + tile.uid"
    @click="emit('click', tile)"
    @keydown.enter="emit('click', tile)"
    @keydown.space.prevent="emit('click', tile)"
  >
    <div class="video" ref="videoRef"></div>

    <div class="topbar">
      <span class="live-tag go" v-if="isLive"><span class="dot"></span>LIVE</span>
      <span class="live-tag bad" v-else-if="isOffline"><span class="dot"></span>OFF</span>
      <span class="live-tag split" v-else-if="tile.fullscreen"><span class="dot"></span>大流</span>
      <span class="empty-grow"></span>
      <button class="mute-btn" :class="{ muted: tile.muted }" @click.stop="emit('mute', tile)" :title="tile.muted ? '取消静音' : '静音'">
        {{ tile.muted ? '×' : '♪' }}
      </button>
    </div>

    <div v-if="!isLive && !isOffline" class="placeholder">
      <svg class="ph-ic" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      <span class="ph-t">STANDBY</span>
      <span class="ph-name">{{ tile.uid }}</span>
      <span class="sub">等待推流…</span>
    </div>

    <div v-if="isOffline" class="placeholder">
      <svg class="ph-ic off" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M22 8.5C19.5 6 16 4.5 12 4.5c-1.6 0-3.1.3-4.5.8M5.5 5.5C3.3 7 1.7 9.1 1 11.5 2.7 16.9 7.9 20.5 12 20.5c1.7 0 3.3-.4 4.8-1.1"/></svg>
      <span class="ph-t">OFFLINE</span>
      <span class="ph-name">{{ tile.uid }}</span>
      <span class="sub off-sub">已离开</span>
    </div>

    <!-- 全屏时可见的退出提示 (P1: 不可发现的退出是红牌) -->
    <div v-if="tile.fullscreen" class="exit-hint">
      按 <kbd>ESC</kbd> 退出全屏
    </div>

    <div class="meta">
      <span class="name">{{ tile.uid }}</span>
      <span class="st">{{ tile.statusText }}</span>
      <span class="stats" v-if="statsText" :class="{ bad: statsBad }">{{ statsText }}</span>
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
  box-shadow: var(--shadow-sm);
  transition: border-color 0.16s var(--ease-out-quart), box-shadow 0.16s var(--ease-out-quart), transform 0.1s var(--ease-out-quart);
}
.tile:hover { border-color: var(--surface-hi); transform: translateY(-1px); }
.tile:active { transform: translateY(0) scale(0.992); }
.tile:focus-visible { outline: 2px solid var(--go); outline-offset: 2px; }
/* 直播中: 绿边 + 信号辉光 (核心广播信号, 必须最醒目) */
.tile.live {
  border-color: var(--go);
  box-shadow: 0 0 0 1px var(--go), 0 0 26px -8px var(--go), inset 0 0 30px -16px var(--go), var(--shadow-sm);
}
.tile.fullscreen { position: fixed; inset: 0; z-index: var(--z-tile-fullscreen); border-radius: 0; aspect-ratio: auto; border: none; box-shadow: none; transform: none; animation: fs-flash 0.5s var(--ease-out-expo); }
/* 全屏聚焦瞬间: 一圈绿环闪烁确认 (键盘/鼠标聚焦都有反馈) */
@keyframes fs-flash {
  0% { box-shadow: inset 0 0 0 4px var(--go); }
  100% { box-shadow: inset 0 0 0 0 transparent; }
}
@media (prefers-reduced-motion: reduce) { .tile.fullscreen { animation: none; } }

.video { width: 100%; height: 100%; position: relative; z-index: 1; }
.video :deep(video) { width: 100%; height: 100%; object-fit: contain; background: #000; }

/* 顶部条 */
.topbar {
  position: absolute; top: 8px; left: 8px; right: 8px;
  display: flex; align-items: center; gap: 6px;
  z-index: 3;
}
.empty-grow { flex: 1; }

.mute-btn {
  display: grid; place-items: center;
  width: 26px; height: 26px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #fff;
  border-radius: var(--radius-sm); cursor: pointer;
  font-size: 12px; font-weight: 700;
  transition: background 0.14s, color 0.14s, border-color 0.14s, transform 0.1s var(--ease-out-quart);
}
.mute-btn:hover { background: rgba(0, 0, 0, 0.78); }
.mute-btn:active { transform: scale(0.9); }
.mute-btn:focus-visible { outline: 2px solid var(--go); outline-offset: 1px; }
.mute-btn.muted { background: var(--bad); border-color: var(--bad); color: #fff; }

/* 占位状态 */
.placeholder {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; gap: 6px;
  align-items: center; justify-content: center;
  color: var(--fg-mute);
}
.ph-t { font-family: var(--font-mono); font-size: 12px; font-weight: 700; letter-spacing: 1.5px; color: var(--fg-mute); }
.ph-ic { color: var(--fg-mute); opacity: 0.4; margin-bottom: 4px; }
.ph-ic.off { color: var(--bad); opacity: 0.5; }
.ph-name { font-size: 15px; font-weight: 700; color: var(--fg-dim); }
.sub { font-size: 11.5px; color: var(--fg-mute); }
.off-sub { color: var(--bad); }

/* 全屏退出提示 */
.exit-hint {
  position: absolute;
  bottom: 20px; left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--fg);
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius);
  padding: 6px 12px;
}
.exit-hint kbd {
  display: inline-block;
  font-family: var(--font-mono);
  background: var(--go);
  color: #04140a;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-size: 11px;
}

/* 底部信息条 (不盖视频主体: 只在底部渐变压一层信息) */
.meta {
  position: absolute; left: 0; right: 0; bottom: 0;
  display: flex; align-items: center; gap: 8px;
  padding: 16px 10px 7px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.88));
  font-size: 12px;
  pointer-events: none;
}
.meta .name { font-weight: 700; color: #fff; }
.meta .st { color: var(--fg-dim); font-size: 10.5px; }
.meta .stats {
  margin-left: auto;
  font-family: var(--font-mono);
  color: var(--fg-dim);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}
.meta .stats.bad { color: var(--split); }   /* 丢包>5% 或 RTT>300ms 变琥珀警示 */
</style>
