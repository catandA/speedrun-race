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
      <span class="live-tag go" v-else><span class="dot"></span>直播中</span>
    </header>

    <!-- 预览: 首屏主区, 选手最该盯的画面 -->
    <div class="preview" :class="{ live: sharing }" ref="previewRef">
      <div v-if="!sharing" class="preview-empty">
        <svg class="ph-ic" viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M8 21h8M12 19v2"/></svg>
        <span class="ph-t">NO SIGNAL</span>
        <span class="ph-s">点「开始直播」选择游戏窗口或显示器</span>
      </div>
    </div>

    <!-- 控制条: 计时器 + 上行参数 + 按钮, 预览下方紧凑横排 -->
    <div class="ctrl-bar">
      <template v-if="sharing">
        <div class="timer-row">
          <span class="rec-dot" aria-hidden="true"></span>
          <span class="live-label">LIVE</span>
          <span class="th-time hero-timer">{{ elapsed }}</span>
          <span class="th-unit">ELAPSED</span>
        </div>
        <div class="uplink-bar" :class="{ bad: uplinkBad }" v-if="uplinkText">{{ uplinkText }}</div>
      </template>

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
        <span class="tag spec">720P · 30FPS</span>
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
.bc-panel { max-width: 760px; padding: var(--space-xl) var(--space-2xl); }

.bc-head { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-lg); justify-content: space-between; }
.title-wrap { display: flex; align-items: center; gap: var(--space-sm); }
.mark {
  display: grid; place-items: center;
  width: 30px; height: 30px;
  background: linear-gradient(160deg, var(--go-soft), var(--go));
  color: #04140a;
  font-family: var(--font-mono);
  font-weight: 800; font-size: 11px;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 12px -4px rgba(61, 245, 138, 0.4), 0 1px 0 0 rgba(255, 255, 255, 0.25) inset;
  flex-shrink: 0;
}
.bc-head h2 { font-size: 15px; font-weight: 700; letter-spacing: 0.2px; }
.subtitle { font-size: 11.5px; color: var(--fg-mute); margin-top: 2px; }

/* 预览: 首屏主区, 直播时绿边辉光 (LIVE 英雄画面, 辉光合理) */
.preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--inset);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}
.preview.live {
  border-color: var(--go);
  box-shadow: 0 0 0 1px var(--go), 0 0 28px -8px var(--go), var(--shadow);
}
/* 屏幕分享预览: SDK 把本地视频当摄像头渲染默认镜像, 但屏幕内容镜像后文字反着看不清。
   反转回来仅影响本地预览渲染, 不影响推流内容(轨道本身不镜像, 裁判侧正常)。 */
.preview :deep(video) {
  width: 100%; height: 100%;
  object-fit: contain;
  position: relative; z-index: 1;
  transform: scaleX(-1);
}
.preview-empty {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; gap: var(--space-sm);
  align-items: center; justify-content: center;
}
.ph-t { font-family: var(--font-mono); font-size: 14px; font-weight: 700; letter-spacing: 2px; color: var(--fg-mute); }
.ph-s { font-size: 11.5px; color: var(--fg-mute); }
.ph-ic { color: var(--fg-mute); opacity: 0.3; margin-bottom: var(--space-sm); }

/* 控制条: 预览下方紧凑区 */
.ctrl-bar {
  margin-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* 直播计时器行: 横排, 发光等宽 (英雄计时器, 保留广播灵魂) */
.timer-row {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: linear-gradient(180deg, var(--go-dim-2), var(--go-dim));
  border: 1px solid var(--border-acc);
  border-left: 2px solid var(--go);
  border-radius: var(--radius);
}
.live-label { font-family: var(--font-mono); font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: var(--go); flex-shrink: 0; }
.th-time { font-size: 26px; flex: 1; }
.th-unit { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1px; color: var(--fg-dim); text-transform: uppercase; flex-shrink: 0; }

/* 上行参数: 等宽终端风, 质量差(≥4)变琥珀 */
.uplink-bar {
  font-family: var(--font-mono);
  font-size: 11px; font-weight: 600; letter-spacing: 0.3px;
  color: var(--fg-dim);
  background: var(--inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-xs) var(--space-md);
  font-variant-numeric: tabular-nums;
}
.uplink-bar.bad { color: var(--split); border-color: #5a4408; }

.actions { display: flex; gap: var(--space-sm); flex-wrap: wrap; align-items: center; }
.spec { margin-left: auto; }

.hint { font-size: 12px; color: var(--fg-dim); margin-top: var(--space-md); line-height: 1.7; }
.warn-box {
  border: 1px solid var(--split);
  border-left: 2px solid var(--split);
  color: var(--split);
  background: var(--split-dim);
  border-radius: var(--radius);
  padding: var(--space-sm) var(--space-md);
  font-size: 11.5px; line-height: 1.6;
  margin-top: var(--space-sm);
}

@media (max-width: 540px) {
  .th-time { font-size: 22px; }
  .th-unit { display: none; }
}
</style>
