<script setup>
import { ref, computed, onMounted } from 'vue'
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
const { joined, status, tiles, judgeMode, join: trtcJoin, leave: trtcLeave, toggleJudgeMode } = useTrtc()
const { stopShare } = useScreenShare()
const { log } = useLog()

const roomLabel = computed(() => '房间: ' + cfg.room)
const roleLabel = computed(() => '角色: ' + (cfg.isJudge ? '裁判' : '选手') + ' (' + cfg.userId + ')')
const onlineCount = computed(() => Object.keys(tiles).length)

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

onMounted(() => {
  // URL 参数齐了就自动进房
  if (cfg.userId && cfg.userSig) {
    onJoin(cfg).catch(e => log('⚠ 进房流程异常: ' + (e && e.message ? e.message : e)))
  }
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
  <JudgePanel v-else :judge-mode="judgeMode" :count="onlineCount" @toggle-mode="toggleJudgeMode" />

  <VideoGrid v-if="joined && cfg.isJudge" />

  <LogPanel />
  <AutoplayOverlay />
</template>
