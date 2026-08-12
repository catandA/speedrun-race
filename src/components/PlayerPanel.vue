<script setup>
import { ref, onMounted } from 'vue'
import { useScreenShare } from '../composables/useScreenShare'

const props = defineProps({ small: String, autoShare: Boolean })
const { sharing, micOn, compatMode, startShare, stopShare, toggleMic, toggleCompat } = useScreenShare()

const previewRef = ref(null)
const use1080 = ref(true)

async function onShare() {
  await startShare({ small: props.small }, previewRef.value, use1080.value)
}

// 进房后若 URL 带 auto=1, 延迟一点自动弹屏幕分享
onMounted(() => {
  if (props.autoShare) setTimeout(onShare, 300)
})
</script>

<template>
  <section class="panel">
    <div class="panel-head"><h2>选手控制台</h2></div>
    <div class="actions">
      <button v-if="!sharing" class="btn green" @click="onShare">📺 开始直播 (分享屏幕)</button>
      <button v-else class="btn red" @click="stopShare">停止直播</button>
      <button class="btn ghost" :class="{ active: micOn }" @click="toggleMic">
        🎙 {{ micOn ? '闭麦' : '开麦' }}
      </button>
      <button class="btn ghost" :class="{ active: compatMode }" @click="toggleCompat" title="主流方案失败时的备选">
        {{ compatMode ? '回到主流模式' : '兼容模式(辅流)' }}
      </button>
      <label class="chk">
        <input type="checkbox" v-model="use1080"> 推 1080p (默认; 720p 更省时长, 存档请用本地OBS)
      </label>
    </div>
    <div class="preview" ref="previewRef"></div>
    <p class="hint">
      点「开始直播」→ 选择游戏窗口或显示器 → 勾选"分享音频" (Chrome Windows 支持系统声音)。
      直播内容作为主流推送(支持小流), 裁判多格查看走小流省流量, 单独查看切大流。
    </p>
    <div v-if="compatMode" class="warn-box">
      兼容模式: 使用官方标准屏幕分享通道 (辅流), 没有小流, 裁判全览时流量更高。若主流模式正常请勿使用。
    </div>
  </section>
</template>

<style scoped>
.panel-head { margin-bottom: 12px; }
.panel-head h2 { font-size: 15px; font-weight: 600; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.chk { display: inline-flex; gap: 7px; align-items: center; font-size: 13px; color: var(--fg-dim); cursor: pointer; }
.chk input { width: auto; }
.preview {
  width: 100%;
  max-width: 560px;
  aspect-ratio: 16 / 9;
  background: #000;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  margin-top: 12px;
}
.preview :deep(video) { width: 100%; height: 100%; object-fit: contain; }
.hint { font-size: 12.5px; color: var(--fg-dim); margin-top: 10px; line-height: 1.7; }
.warn-box {
  border: 1px solid var(--warn);
  color: var(--warn);
  background: rgba(251, 191, 36, 0.08);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  font-size: 12px;
  margin-top: 10px;
}
</style>
