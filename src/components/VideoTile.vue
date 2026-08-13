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
    @click="emit('click', tile)"
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
      <span class="ph-t">STANDBY</span>
      <span class="ph-name">{{ tile.uid }}</span>
      <span class="sub">等待推流…</span>
    </div>

    <div v-if="isOffline" class="placeholder">
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
  transition: border-color 0.14s var(--ease-out-quart), box-shadow 0.14s var(--ease-out-quart);
}
.tile:hover { border-color: var(--go); }
/* 直播中: 绿边 + 信号辉光, 和待机/离线拉开明显差距 */
.tile.live {
  border-color: var(--go);
  box-shadow: 0 0 0 1px var(--go), 0 0 26px -8px var(--go), inset 0 0 30px -16px var(--go);
}
.tile.fullscreen { position: fixed; inset: 0; z-index: 50; border-radius: 0; aspect-ratio: auto; border: none; box-shadow: none; }

.video { width: 100%; height: 100%; position: relative; z-index: 1; }
.video :deep(video) { width: 100%; height: 100%; object-fit: contain; background: #000; }

/* 顶部条 */
.topbar {
  position: absolute; top: 7px; left: 7px; right: 7px;
  display: flex; align-items: center; gap: 6px;
  z-index: 3;
}
.empty-grow { flex: 1; }

.mute-btn {
  display: grid; place-items: center;
  width: 24px; height: 24px;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  border-radius: var(--radius-sm); cursor: pointer;
  font-size: 12px; font-weight: 700;
  transition: background 0.1s, color 0.1s;
}
.mute-btn:hover { background: rgba(0,0,0,0.8); }
.mute-btn.muted { background: var(--bad); border-color: var(--bad); color: #fff; }

/* 占位状态 */
.placeholder {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; gap: 5px;
  align-items: center; justify-content: center;
  color: var(--fg-mute);
}
.ph-t { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; color: var(--fg-mute); }
.ph-name { font-size: 14px; font-weight: 700; color: var(--fg-dim); }
.sub { font-size: 11px; color: var(--fg-mute); }
.off-sub { color: var(--bad); }

/* 全屏退出提示 */
.exit-hint {
  position: absolute;
  bottom: 20px; left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--fg);
  background: rgba(0,0,0,0.7);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 6px 12px;
}
.exit-hint kbd {
  display: inline-block;
  font-family: inherit;
  background: var(--go);
  color: #04140a;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-size: 11px;
}

/* 底部信息条 */
.meta {
  position: absolute; left: 0; right: 0; bottom: 0;
  display: flex; align-items: center; gap: 8px;
  padding: 14px 10px 7px;
  background: linear-gradient(transparent, rgba(0,0,0,0.9));
  font-size: 12px;
  pointer-events: none;
}
.meta .name { font-weight: 700; color: #fff; }
.meta .st { color: var(--fg-dim); font-size: 10.5px; }
.meta .stats {
  margin-left: auto;
  color: var(--fg-dim);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}
.meta .stats.bad { color: var(--split); }   /* 丢包>5% 或 RTT>300ms 变琥珀警示 */
</style>
