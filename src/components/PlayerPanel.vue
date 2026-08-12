<script setup>
import { ref, onMounted } from 'vue'
import { useScreenShare } from '../composables/useScreenShare'

const props = defineProps({ small: String, autoShare: Boolean })
const { sharing, micOn, compatMode, startShare, stopShare, toggleMic, toggleCompat } = useScreenShare()

const previewRef = ref(null)

async function onShare() {
  // 固定 720p 30fps (省时长包; 高清存档交给选手本地 OBS)
  await startShare({ small: props.small }, previewRef.value, false)
}

// 进房后若 URL 带 auto=1, 延迟一点自动弹屏幕分享
onMounted(() => {
  if (props.autoShare) setTimeout(onShare, 300)
})
</script>

<template>
  <section class="panel bc-panel">
    <header class="bc-head">
      <div class="title-wrap">
        <span class="ic" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/></svg>
        </span>
        <div>
          <h2>选手控制台</h2>
          <p class="subtitle">分享你的屏幕画面作为直播主流</p>
        </div>
      </div>
      <span class="live-badge" v-if="sharing">
        <span class="live-dot"></span> LIVE
      </span>
      <span class="badge" v-else>未开播</span>
    </header>

    <div class="actions">
      <button v-if="!sharing" class="btn green" @click="onShare">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m10 9 5 3-5 3z"/></svg>
        开始直播
      </button>
      <button v-else class="btn red" @click="stopShare">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>
        停止直播
      </button>
      <button class="btn ghost" :class="{ active: micOn }" @click="toggleMic">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>
        {{ micOn ? '闭麦' : '开麦' }}
      </button>
      <button class="btn ghost" :class="{ active: compatMode }" @click="toggleCompat" title="主流方案失败时的备选">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2-2z"/></svg>
        {{ compatMode ? '回到主流模式' : '兼容模式' }}
      </button>
      <span class="badge spec">720p · 30fps</span>
    </div>

    <div class="preview" :class="{ live: sharing }" ref="previewRef">
      <div v-if="!sharing" class="preview-empty">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="m8 22 4-4 4 4"/></svg>
        <span>点击「开始直播」选择游戏窗口或显示器</span>
      </div>
      <div class="preview-frame" v-if="sharing"></div>
    </div>

    <p class="hint">
      点「开始直播」→ 选择游戏窗口或显示器 → 勾选"分享音频" (Chrome Windows 支持系统声音)。
      直播内容作为主流推送 (支持小流), 裁判多格查看走小流省流量, 单独查看切大流。
    </p>
    <div v-if="compatMode" class="warn-box">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.2 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
      兼容模式: 使用官方标准屏幕分享通道 (辅流), 没有小流, 裁判全览时流量更高。若主流模式正常请勿使用。
    </div>
  </section>
</template>

<style scoped>
.bc-panel { max-width: 720px; padding: 22px 24px; }

.bc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.title-wrap { display: flex; align-items: center; gap: 11px; }
.ic {
  display: grid; place-items: center;
  width: 34px; height: 34px; border-radius: 10px;
  background: var(--acc-soft); color: var(--acc);
  border: 1px solid var(--border-acc);
}
.bc-head h2 { font-size: 16px; font-weight: 700; }
.subtitle { font-size: 12px; color: var(--fg-mute); margin-top: 1px; }

.live-badge {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 11.5px; font-weight: 700; letter-spacing: 1px;
  color: #fff;
  background: linear-gradient(135deg, #fb7185, #f43f5e);
  padding: 4px 11px; border-radius: 20px;
  box-shadow: 0 4px 14px rgba(244,63,94,0.4);
}
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: #fff; animation: pulse 1.2s infinite; }
@keyframes pulse { 50% { opacity: 0.35; } }

.badge {
  margin-left: auto;
  font-size: 11.5px; color: var(--fg-dim);
  background: var(--surface-2); border: 1px solid var(--border);
  padding: 4px 11px; border-radius: 20px;
}
.badge.spec { margin-left: 0; }

.actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

.preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--inset);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  margin-top: 16px;
  overflow: hidden;
  box-shadow: inset 0 0 60px rgba(0,0,0,0.5);
}
.preview.live { border-color: var(--border-acc); box-shadow: inset 0 0 60px rgba(0,0,0,0.5), 0 0 0 1px var(--border-acc); }
.preview :deep(video) { width: 100%; height: 100%; object-fit: contain; }
.preview-empty {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; gap: 12px;
  align-items: center; justify-content: center;
  color: var(--fg-mute); font-size: 13px;
}
.preview-frame { display: none; }

.hint { font-size: 12.5px; color: var(--fg-dim); margin-top: 14px; line-height: 1.8; }
.warn-box {
  display: flex; gap: 9px; align-items: flex-start;
  border: 1px solid rgba(251,191,36,0.4);
  color: var(--warn);
  background: rgba(251,191,36,0.08);
  border-radius: var(--radius-sm);
  padding: 11px 13px;
  font-size: 12px; line-height: 1.7;
  margin-top: 12px;
}
.warn-box svg { flex-shrink: 0; margin-top: 1px; }
</style>
