<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { parseConfig, JUDGE_SALT } from './composables/useConfig'
import { precheckUserSig, verifyJudgeToken } from './composables/useUserSig'
import { useTrtc } from './composables/useTrtc'
import { useScreenShare } from './composables/useScreenShare'
import { useLog } from './composables/useLog'
import HeaderBar from './components/HeaderBar.vue'
import JoinForm from './components/JoinForm.vue'
import PlayerPanel from './components/PlayerPanel.vue'
import JudgePanel from './components/JudgePanel.vue'
import VideoGrid from './components/VideoGrid.vue'
import LogPanel from './components/LogPanel.vue'
import AutoplayOverlay from './components/AutoplayOverlay.vue'

const cfg = parseConfig()
const { joined, status, tiles, focusedUid, join: trtcJoin, leave: trtcLeave } = useTrtc()
const { stopShare } = useScreenShare()
const { log } = useLog()

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

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)
  // URL 参数齐了就自动进房
  if (cfg.userId && cfg.userSig) {
    onJoin(cfg).catch(e => log('⚠ 进房流程异常: ' + (e && e.message ? e.message : e)))
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pagehide', onPageHide)
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

  <JoinForm v-if="!joined" :initial="cfg" @join="onJoin" />

  <PlayerPanel v-else-if="!cfg.isJudge" :small="cfg.small" :auto-share="cfg.autoShare" />
  <JudgePanel v-else :count="onlineCount" :focused="hasFocus" />

  <VideoGrid v-if="joined && cfg.isJudge" />

  <LogPanel />
  <AutoplayOverlay />
</template>
