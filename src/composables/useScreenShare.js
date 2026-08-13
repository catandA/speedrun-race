import { ref } from 'vue'
import { useTrtc } from './useTrtc'
import { useLog } from './useLog'
import { SMALL_PROFILE } from './useConfig'

const sharing = ref(false)
const micOn = ref(false)
const compatMode = ref(false)
const liveSince = ref(null)   // 开播起始时间戳, 用于 LIVE 计时器
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

  async function startShare(cfg, previewEl) {
    if (!joined.value) return
    // 采集侧硬上限 1280×720/30fps (用 max 非 ideal, 防高分辨率显示器采集超规源再缩放浪费上行/CPU)
    const vc = { width: { max: 1280 }, height: { max: 720 }, frameRate: { max: 30 } }
    const mainProfile = '720p'   // 大流固定 720p (HD档 28元, 1500kbps, TRTC屏幕分享推荐值)
    const smallOpt = cfg.small ? SMALL_PROFILE : false
    bindScreenStopped()
    try {
      if (compatMode.value) {
        await trtc.value.startScreenShare({ view: previewEl, option: { systemAudio: true, mirror: false } })
        log('✅ 已用兼容模式(辅流)开播')
      } else {
        // 主流方案: 屏幕轨道塞进主流 + 开小流
        const ds = await navigator.mediaDevices.getDisplayMedia({ video: vc, audio: true })
        screenTrack = ds.getVideoTracks()[0]
        const aTrack = ds.getAudioTracks()[0] || null
        ds.getVideoTracks().forEach(tr => tr.addEventListener('ended', () => onScreenEnded()))
        // mirror:false 关闭本地预览镜像 (SDK 默认按摄像头自拍镜像, 屏幕内容镜像后文字/游戏UI会反)
        try {
          await trtc.value.startLocalVideo({ view: previewEl, option: { videoTrack: screenTrack, profile: mainProfile, small: smallOpt, mirror: false } })
        } catch (e1) {
          log('⚠ 直接注入屏幕轨道失败, 走降级: ' + e1.message)
          await trtc.value.startLocalVideo({ view: previewEl, option: { mirror: false } })
          await trtc.value.updateLocalVideo({ option: { videoTrack: screenTrack, profile: mainProfile, small: smallOpt, mirror: false } })
        }
        if (aTrack) {
          try { await trtc.value.updateLocalAudio({ option: { audioTrack: aTrack } }); log('✅ 系统声音已接入主流') }
          catch (e2) { log('⚠ 系统声音接入失败, 可点「开麦」用麦克风: ' + e2.message) }
        }
        log('✅ 已开播: 屏幕=主流 720p/1500kbps, 小流=' + (smallOpt ? '640×480/500kbps' : '关'))
      }
      sharing.value = true
      liveSince.value = Date.now()
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
      liveSince.value = null
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

  return { sharing, micOn, compatMode, liveSince, startShare, stopShare, toggleMic, toggleCompat }
}
