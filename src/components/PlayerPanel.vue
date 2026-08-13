<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useScreenShare } from '../composables/useScreenShare'
import { useTrtc } from '../composables/useTrtc'

const props = defineProps({ small: String, autoShare: Boolean })
const { sharing, micOn, compatMode, liveSince, startShare, stopShare, toggleMic, toggleCompat } = useScreenShare()
const { localStats } = useTrtc()

const previewRef = ref(null)

async function onShare() {
  // 大流固定 720p (省时长包; 高清存档交给选手本地 OBS)
  await startShare({ small: props.small }, previewRef.value)
}

// 进房后若 URL 带 auto=1, 延迟一点自动弹屏幕分享
onMounted(() => {
  if (props.autoShare) setTimeout(onShare, 300)
})

/* LIVE 计时器: 开播后每秒刷新, 像速通分段计时 */
const now = ref(Date.now())
let timer = null
watch(sharing, (s) => {
  if (s) {
    now.value = Date.now()
    timer = setInterval(() => { now.value = Date.now() }, 1000)
  } else if (timer) {
    clearInterval(timer); timer = null
  }
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
const elapsed = computed(() => {
  if (!liveSince.value) return '00:00:00'
  const s = Math.floor((now.value - liveSince.value) / 1000)
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return h + ':' + m + ':' + sec
})

// 推流实时参数行: 上行网络质量(NETWORK_QUALITY 事件每2秒刷新)
// Q0=没建立上行连接(没推流), 不显示; 推流后 Q1-6 才显示
const QMAP = ['', '极佳', '良好', '一般', '较差', '很差', '断开']
const uplinkText = computed(() => {
  const s = localStats.value
  if (!s || s.upQ == null || s.upQ === 0) return ''
  const q = QMAP[s.upQ] || ('Q' + s.upQ)
  const loss = s.upLoss != null ? '↑' + s.upLoss + '%' : ''
  const rtt = s.upRtt != null ? s.upRtt + 'ms' : ''
  return ['上行' + q, loss, rtt].filter(Boolean).join(' · ')
})
const uplinkBad = computed(() => localStats.value && localStats.value.upQ != null && localStats.value.upQ >= 4)
</script>

<template>
  <section class="panel bc-panel">
    <header class="bc-head">
      <div class="title-wrap">
        <span class="mark">P1</span>
        <div>
          <h2>选手控制台</h2>
          <p class="subtitle">分享屏幕作为直播主流</p>
        </div>
      </div>
      <span class="tag" v-if="!sharing">未开播</span>
    </header>

    <!-- 英雄计时器: 速通直播的灵魂, 直播中才显示 -->
    <div class="timer-hero" v-if="sharing">
      <div class="th-left">
        <span class="rec-dot" aria-hidden="true"></span>
        <span class="th-live">LIVE</span>
        <span class="th-tag">REC</span>
      </div>
      <div class="th-time hero-timer">{{ elapsed }}</div>
      <div class="th-right">
        <span class="th-unit">ELAPSED</span>
      </div>
    </div>

    <!-- 推流实时参数: 上行网络质量/丢包/RTT (NETWORK_QUALITY 每2秒刷新) -->
    <div class="uplink-bar" :class="{ bad: uplinkBad }" v-if="uplinkText">{{ uplinkText }}</div>

    <div class="actions">
      <button v-if="!sharing" class="btn green" @click="onShare">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        开始直播
      </button>
      <button v-else class="btn red" @click="stopShare">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>
        停止直播
      </button>
      <button class="btn ghost" :class="{ active: micOn }" @click="toggleMic">
        {{ micOn ? '闭麦' : '开麦' }}
      </button>
      <button class="btn ghost" :class="{ active: compatMode }" @click="toggleCompat" title="主流方案失败时的备选">
        {{ compatMode ? '回到主流' : '兼容模式' }}
      </button>
      <span class="tag">720P · 30FPS</span>
    </div>

    <div class="preview" :class="{ live: sharing }" ref="previewRef">
      <div v-if="!sharing" class="preview-empty">
        <span class="ph-t">NO SIGNAL</span>
        <span class="ph-s">点「开始直播」选择游戏窗口或显示器</span>
      </div>
    </div>

    <p class="hint">
      点「开始直播」→ 选择游戏窗口或显示器 → 勾选「分享音频」(Chrome Windows 支持系统声音)。
      直播作为主流推送(支持小流), 裁判多格查看走小流省流量, 单独查看切大流。
    </p>
    <div v-if="compatMode" class="warn-box">
      ▲ 兼容模式: 使用官方标准屏幕分享通道(辅流), 没有小流, 裁判全览时流量更高。若主流正常请勿使用。
    </div>
  </section>
</template>

<style scoped>
.bc-panel { max-width: 680px; padding: 20px 22px; }

.bc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; justify-content: space-between; }
.title-wrap { display: flex; align-items: center; gap: 10px; }
.mark {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  background: var(--go); color: #04140a;
  font-weight: 800; font-size: 12px;
  border-radius: var(--radius);
  box-shadow: 0 0 16px -6px var(--go);
}
.bc-head h2 { font-size: 15px; font-weight: 700; letter-spacing: 0.4px; }
.subtitle { font-size: 11px; color: var(--fg-mute); margin-top: 2px; }

/* —— 英雄计时器: 直播中才有, 巨型发光等宽, 速通灵魂 —— */
.timer-hero {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 18px;
  margin: 4px 0 16px;
  background: linear-gradient(180deg, var(--go-dim), rgba(14, 58, 34, 0.25));
  border: 1px solid var(--border-acc);
  border-radius: var(--radius);
  box-shadow: var(--go-glow);
  position: relative;
  overflow: hidden;
}
/* 计时器左侧一道高光, 像计分板灯条 */
.timer-hero::before {
  content: "";
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--go);
  box-shadow: 0 0 12px var(--go);
}
.th-left { display: flex; align-items: center; gap: 9px; flex-shrink: 0; }
.th-live { font-size: 13px; font-weight: 800; letter-spacing: 2px; color: var(--go); }
.th-tag {
  font-size: 9.5px; font-weight: 700; letter-spacing: 1px;
  color: var(--bad); background: var(--bad-dim);
  border: 1px solid #5a1e2e;
  padding: 2px 6px; border-radius: var(--radius-sm);
}
.th-time { font-size: 40px; flex: 1; text-align: center; }
.th-right { flex-shrink: 0; }
.th-unit { font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; color: var(--fg-dim); text-transform: uppercase; }

/* 推流实时参数行: 紧贴计时器下方, 终端风小字, 质量差(≥4)时变琥珀警示 */
.uplink-bar {
  font-size: 11px; font-weight: 600; letter-spacing: 0.3px;
  color: var(--fg-dim);
  background: var(--inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 11px;
  margin: -8px 0 14px;
  font-variant-numeric: tabular-nums;
}
.uplink-bar.bad { color: var(--split); border-color: #5a4408; }
@media (max-width: 560px) {
  .th-time { font-size: 30px; }
  .timer-hero { gap: 10px; padding: 12px 14px; }
  .th-right { display: none; }
}

.actions { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; }

.preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--inset);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  margin-top: 14px;
  overflow: hidden;
}
.preview.live { border-color: var(--go); box-shadow: 0 0 26px -8px var(--go); }
.preview :deep(video) { width: 100%; height: 100%; object-fit: contain; position: relative; z-index: 1; }
.preview-empty {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; gap: 8px;
  align-items: center; justify-content: center;
}
.ph-t { font-size: 13px; font-weight: 700; letter-spacing: 2px; color: var(--fg-mute); }
.ph-s { font-size: 11px; color: var(--fg-mute); }

.hint { font-size: 11.5px; color: var(--fg-dim); margin-top: 12px; line-height: 1.8; }
.warn-box {
  border: 1px solid var(--split);
  border-left: 2px solid var(--split);
  color: var(--split);
  background: var(--split-dim);
  border-radius: var(--radius);
  padding: 9px 11px;
  font-size: 11px; line-height: 1.7;
  margin-top: 10px;
}
</style>
