import { ref } from 'vue'
import { useTrtc } from './useTrtc'
import { useLog } from './useLog'

const sharing = ref(false)
const micOn = ref(false)
const compatMode = ref(false)
let screenTrack = null
let screenStoppedBound = false

export function useScreenShare() {
  const { trtc, joined } = useTrtc()
  const { log } = useLog()

  // 绑定 SDK 的屏幕分享被外部停止事件 (只绑一次)
  function bindScreenStopped() {
    if (screenStoppedBound || !trtc.value || !window.TRTC) return
    const E = TRTC.EVENT
    if (E && E.SCREEN_SHARE_STOPPED) {
      trtc.value.on(E.SCREEN_SHARE_STOPPED, () => {
        sharing.value = false
        log('屏幕分享已停止')
      })
      screenStoppedBound = true
    }
  }

  async function startShare(cfg, previewEl, use1080) {
    if (!joined.value) return
    const vc = use1080 ? { frameRate: 30 } : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: 30 }
    bindScreenStopped()
    try {
      if (compatMode.value) {
        await trtc.value.startScreenShare({ view: previewEl, option: { systemAudio: true } })
        log('✅ 已用兼容模式(辅流)开播')
      } else {
        // 主流方案: 屏幕轨道塞进主流 + 开小流
        const ds = await navigator.mediaDevices.getDisplayMedia({ video: vc, audio: true })
        screenTrack = ds.getVideoTracks()[0]
        const aTrack = ds.getAudioTracks()[0] || null
        ds.getVideoTracks().forEach(tr => tr.addEventListener('ended', () => onScreenEnded()))
        try {
          await trtc.value.startLocalVideo({ view: previewEl, option: { videoTrack: screenTrack, small: cfg.small } })
        } catch (e1) {
          log('⚠ 直接注入屏幕轨道失败, 走降级: ' + e1.message)
          await trtc.value.startLocalVideo({ view: previewEl })
          await trtc.value.updateLocalVideo({ option: { videoTrack: screenTrack, small: cfg.small } })
        }
        if (aTrack) {
          try { await trtc.value.updateLocalAudio({ option: { audioTrack: aTrack } }); log('✅ 系统声音已接入主流') }
          catch (e2) { log('⚠ 系统声音接入失败, 可点「开麦」用麦克风: ' + e2.message) }
        }
        log('✅ 已开播: 屏幕=主流' + (use1080 ? ' 1080p' : ' 720p') + ', 小流=' + cfg.small)
      }
      sharing.value = true
    } catch (e) {
      log('❌ 开播失败: ' + (e && e.message ? e.message : e))
    }
  }

  async function stopShare() {
    try {
      if (compatMode.value) await trtc.value.stopScreenShare()
      else {
        if (screenTrack) { screenTrack.stop(); screenTrack = null }
        await trtc.value.stopLocalVideo()
        await trtc.value.stopLocalAudio()
        micOn.value = false
      }
      sharing.value = false
    } catch (e) { log('⚠ 停止失败: ' + e.message) }
  }

  function onScreenEnded() {
    if (sharing.value) { log('⚠ 屏幕分享被系统结束 (可能点了"停止共享")'); stopShare() }
  }

  async function toggleMic() {
    if (!joined.value) return
    try {
      if (!micOn.value) { await trtc.value.startLocalAudio(); micOn.value = true; log('麦克风已开') }
      else { await trtc.value.stopLocalAudio(); micOn.value = false; log('麦克风已关') }
    } catch (e) { log('⚠ 麦克风失败: ' + e.message) }
  }

  function toggleCompat() {
    compatMode.value = !compatMode.value
    log(compatMode.value ? '已切换兼容模式(辅流)' : '已切换主流模式')
  }

  return { sharing, micOn, compatMode, startShare, stopShare, toggleMic, toggleCompat }
}
