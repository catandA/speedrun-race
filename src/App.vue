<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { parseConfig, JUDGE_SALT } from './composables/useConfig'
import { precheckUserSig, verifyJudgeToken } from './composables/useUserSig'
import { useTrtc } from './composables/useTrtc'
import { useScreenShare } from './composables/useScreenShare'
import { useLog } from './composables/useLog'
import { useToast } from './composables/useToast'
import HeaderBar from './components/HeaderBar.vue'
import JoinForm from './components/JoinForm.vue'
import PlayerPanel from './components/PlayerPanel.vue'
import JudgePanel from './components/JudgePanel.vue'
import VideoGrid from './components/VideoGrid.vue'
import LogPanel from './components/LogPanel.vue'
import AutoplayOverlay from './components/AutoplayOverlay.vue'
import ToastContainer from './components/ToastContainer.vue'

const cfg = parseConfig()
const { joined, status, tiles, focusedUid, join: trtcJoin, leave: trtcLeave, tileClick, toggleMute } = useTrtc()
const { stopShare } = useScreenShare()
const { log } = useLog()
const toast = useToast()

const roomLabel = computed(() => '房间: ' + cfg.room)
const roleLabel = computed(() => '角色: ' + (cfg.isJudge ? '裁判' : '选手') + ' (' + cfg.userId + ')')
const onlineCount = computed(() => Object.keys(tiles).length)
const hasFocus = computed(() => !!focusedUid.value)

async function onJoin(form) {
  // 合并表单到 cfg
  cfg.room = form.room || cfg.room
  cfg.userId = form.userId
  cfg.userSig = form.userSig
  cfg.isJudge = form.isJudge
  cfg.judgeToken = form.judgeToken
  if (cfg.isJudge) {
    // 验证裁判凭据 (HMAC 签名), 不通过则降级为选手
    const ok = cfg.judgeToken ? await verifyJudgeToken(JUDGE_SALT, cfg.judgeToken, cfg.userId) : false
    if (!ok) {
      log('⚠ 裁判凭据无效或缺失, 已降级为选手模式 (裁判链接由组织者用工具生成, 选手无法自行进入)')
      cfg.isJudge = false
    }
  }
  if (!cfg.userId) { log('⚠ 请填写用户ID'); return }
  if (!cfg.userSig) { log('⚠ 请填写 UserSig'); return }
  // 本地预检 UserSig
  const pre = await precheckUserSig(cfg.userSig, cfg.userId, cfg.sdkAppId)
  if (pre.length) { pre.forEach(m => log('⚠ ' + m)); return }
  await trtcJoin(cfg)
  toast.ok(cfg.isJudge ? '已进入裁判台' : '已进入直播间')
}

async function onLeave() {
  try { await stopShare() } catch (x) {}
  await trtcLeave()
  // 清掉 URL 参数再重载, 否则带 room/userId/userSig 的链接 reload 后会因自动进房逻辑又进房
  const url = new URL(location.href)
  url.search = ''
  location.replace(url.toString())
}

// === 后台/关闭自动退房防护 ===
// 避免页面后台或直接关闭后, TRTC 连接仍挂着持续计费 (语音时长按在房时长累加)
const HIDE_TIMEOUT = 5 * 60 * 1000   // 切后台超过5分钟自动退房
let hideTimer = null

function clearHideTimer() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
}

// 后台超时退房: 页面还活着, 可以 await 完整清理
async function autoLeaveForHidden() {
  if (!joined.value) return
  hideTimer = null
  try { await stopShare() } catch (x) {}
  await trtcLeave()
  log('⚠ 因后台超时已自动退房 (避免持续计费), 回来请重新进房')
  toast.warn('后台超时已自动退房')
}

function onVisibility() {
  if (document.hidden) {
    if (joined.value && !hideTimer) hideTimer = setTimeout(autoLeaveForHidden, HIDE_TIMEOUT)
  } else {
    // 回到前台: 取消退房计划 (5分钟内回来不退)
    clearHideTimer()
  }
}

function onPageHide() {
  // 页面关闭/刷新: 立即断开连接, 不 await (页面即将卸载, 尽力发离开信令)
  clearHideTimer()
  if (joined.value) {
    try { stopShare() } catch (x) {}
    try { trtcLeave() } catch (x) {}
  }
}

// === 裁判键盘快捷键 (s6) ===
// ESC: 退出全屏聚焦;  1-9: 聚焦对应序号的选手;  Space: 静音/取消聚焦者
// 只在裁判模式且已进房时生效; 在表单/输入框聚焦时不抢键
function onKeydown(e) {
  if (!joined.value || !cfg.isJudge) return
  const t = e.target
  const tag = t && t.tagName
  // 在输入框/文本域里敲键不抢
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return

  // ESC: 退出全屏
  if (e.key === 'Escape') {
    if (focusedUid.value) {
      const f = tiles[focusedUid.value]
      if (f) tileClick(f)
      e.preventDefault()
    }
    return
  }

  // 数字键 1-9: 聚焦对应选手
  if (e.key >= '1' && e.key <= '9') {
    const arr = Object.values(tiles)
    const idx = Number(e.key) - 1
    if (arr[idx]) {
      tileClick(arr[idx])
      e.preventDefault()
    }
    return
  }

  // 空格: 静音/取消聚焦者
  if (e.code === 'Space') {
    if (focusedUid.value) {
      const f = tiles[focusedUid.value]
      if (f) { toggleMute(f); e.preventDefault() }
    }
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('keydown', onKeydown)
  // URL 参数齐了就自动进房
  if (cfg.userId && cfg.userSig) {
    onJoin(cfg).catch(e => log('⚠ 进房流程异常: ' + (e && e.message ? e.message : e)))
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pagehide', onPageHide)
  window.removeEventListener('keydown', onKeydown)
  clearHideTimer()
})
</script>

<template>
  <HeaderBar
    :room="roomLabel"
    :role="roleLabel"
    :status-text="status.text"
    :status-cls="status.cls"
    :joined="joined"
    @leave="onLeave"
  />

  <!-- 视图切换: 进房/退房像广播台切信号源, out-in 避免重叠 -->
  <Transition name="view" mode="out-in">
    <!-- 未进房: 角色分流进房 + 底部日志 -->
    <section v-if="!joined" key="join" class="view-stage">
      <JoinForm :initial="cfg" @join="onJoin" />
      <LogPanel variant="bottom" />
    </section>

    <!-- 选手工作区: 预览为主 (PlayerPanel 内部重排) -->
    <section v-else-if="!cfg.isJudge" key="player" class="view-stage">
      <PlayerPanel :small="cfg.small" :auto-share="cfg.autoShare" />
      <LogPanel variant="bottom" />
    </section>

    <!-- 裁判工作区: 侧栏(状态+日志) + 主视频区 -->
    <div v-else key="judge" class="workspace view-stage">
      <aside class="sidebar">
        <JudgePanel :count="onlineCount" :focused="hasFocus" />
        <LogPanel variant="sidebar" />
      </aside>
      <main class="main-area">
        <VideoGrid />
      </main>
    </div>
  </Transition>

  <AutoplayOverlay />
  <ToastContainer />
</template>

<style scoped>
/* 视图切换: 淡入 + 轻微上移, 像信号源切换 */
.view-stage { position: relative; }
.view-enter-from { opacity: 0; transform: translateY(10px); }
.view-leave-to { opacity: 0; transform: translateY(-6px); }
.view-enter-active { transition: opacity 0.22s var(--ease-out-expo), transform 0.22s var(--ease-out-expo); }
.view-leave-active { transition: opacity 0.16s var(--ease-out-quart), transform 0.16s var(--ease-out-quart); position: absolute; left: 0; right: 0; }
@media (prefers-reduced-motion: reduce) {
  .view-enter-active, .view-leave-active { transition: opacity 0.15s; transform: none; }
}
</style>
