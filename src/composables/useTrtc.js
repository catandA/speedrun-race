import { ref, reactive } from 'vue'
import { useLog } from './useLog'

// 单例状态 (整个应用共享一个 trtc 客户端)
const trtc = ref(null)
const joined = ref(false)
const status = reactive({ text: '未连接', cls: '' })
const tiles = reactive({})        // uid -> tile 对象 (reactive)
const focusedUid = ref(null)       // 当前全屏聚焦的选手, null = 网格模式
const localStats = ref(null)       // 本地推流实时统计 (STATISTICS 事件, 选手推流参数显示用)

let EV = {}

export function useTrtc() {
  const { log } = useLog()

  function setStatus(txt, cls) {
    status.text = txt
    status.cls = cls || ''
  }

  function ensureTrtcReady(cb) {
    if (window.TRTC) { EV = TRTC.EVENT; cb(); return }
    let n = 0
    const timer = setInterval(() => {
      if (window.TRTC) { clearInterval(timer); EV = TRTC.EVENT; cb() }
      else if (++n > 100) { clearInterval(timer); log('❌ SDK 未就绪') }
    }, 200)
  }

  async function join(cfg) {
    ensureTrtcReady(() => {
      if (!TRTC.isSupported()) { log('❌ 当前浏览器不支持 WebRTC/TRTC, 请使用最新版 Chrome 或 Edge'); return }
      doJoin(cfg)
    })
  }

  async function doJoin(cfg) {
    try {
      trtc.value = TRTC.create()
      log('进房: 房间=' + cfg.room + ' 用户=' + cfg.userId + (cfg.isJudge ? ' (裁判)' : ''))
      await trtc.value.enterRoom({
        scene: 'rtc',
        sdkAppId: cfg.sdkAppId,
        userId: cfg.userId,
        userSig: cfg.userSig,
        strRoomId: cfg.room
      })
      joined.value = true
      bindEvents(cfg)
      if (cfg.isJudge) {
        setStatus('已进房 · 等待选手推流', 'mid')
      } else {
        setStatus('已进房', 'on')
      }
    } catch (e) {
      log('❌ 进房失败: ' + (e && e.message ? e.message : e))
      setStatus('进房失败', 'off')
    }
  }

  function bindEvents(cfg) {
    const E = TRTC.EVENT
    const t = trtc.value
    if (E.CONNECTION_STATE_CHANGED) t.on(E.CONNECTION_STATE_CHANGED, e => {
      const s = (e && e.curState) || ''
      const map = {
        DISCONNECTED: ['已断开', 'off'],
        CONNECTING: ['连接中…', 'mid'],
        CONNECTED: ['已连接', 'on'],
        RECONNECTING: ['重连中…', 'warn'],
        RECONNECTED: ['已重连', 'on']
      }
      const m = map[s] || [s, 'mid']
      setStatus(m[0], m[1])
      if (s === 'RECONNECTED') log('✅ 已自动重连')
    })
    if (E.ERROR) t.on(E.ERROR, e => log('⚠ 错误: ' + (e && (e.message || e.code) ? (e.message || e.code) : JSON.stringify(e))))
    if (E.AUTOPLAY_FAILED) t.on(E.AUTOPLAY_FAILED, () => { /* 触发 overlay, 由 App 处理 */ window.dispatchEvent(new CustomEvent('autoplay-failed')) })
    if (E.KICKED_OUT) t.on(E.KICKED_OUT, () => { log('⚠ 被踢出房间 (用户ID重复?)'); setStatus('被踢出', 'off') })

    // STATISTICS: 每2秒回调一次, 含本地推流+远端拉流实时参数 (分辨率/码率/帧率/丢包/RTT)
    // 选手侧: localStatistics 显示自己的推流参数; 裁判侧: remoteStatistics 显示每个选手的拉流参数
    if (E.STATISTICS) t.on(E.STATISTICS, e => {
      try {
        // 本地推流统计: 选手推主流(屏幕轨道), 取主流那项 (双流编码时 localStatistics 可能含大小流两项)
        const ls = e.localStatistics
        if (ls) {
          const arr = Array.isArray(ls) ? ls : [ls]
          const main = arr.find(x => !x.streamType || x.streamType === 'main' || x.streamType === (TRTC.TYPE && TRTC.TYPE.STREAM_TYPE_MAIN)) || arr[0]
          if (main && (main.width || main.videoBitrate)) {
            localStats.value = {
              w: main.width, h: main.height, fps: main.frameRate, kbps: main.videoBitrate,
              upLoss: e.upLoss, rtt: e.rtt
            }
          }
        }
        // 远端拉流统计: 写入对应 tile, VideoTile 自动响应显示
        if (Array.isArray(e.remoteStatistics)) {
          e.remoteStatistics.forEach(r => {
            const tile = tiles[r.userId]
            if (!tile) return
            tile.stats = {
              w: r.width, h: r.height, fps: r.frameRate, kbps: r.videoBitrate,
              loss: r.videoPacketLoss, rtt: r.remoteNetworkRTT
            }
          })
        }
      } catch (x) { /* 统计解析失败不影响通话 */ }
    })

    if (!cfg.isJudge) return

    // 裁判: 远端用户/流管理 (统一订阅, 聚焦者拉大流, 其余拉小流)
    if (E.REMOTE_USER_ENTER) t.on(E.REMOTE_USER_ENTER, e => ensureTile(e.userId))
    if (E.REMOTE_USER_EXIT) t.on(E.REMOTE_USER_EXIT, e => setTileOffline(e.userId))
    if (E.REMOTE_VIDEO_AVAILABLE) t.on(E.REMOTE_VIDEO_AVAILABLE, e => {
      const tile = ensureTile(e.userId)
      tile.types[e.streamType] = true
      tile.streamType = preferType(tile)
      updateTileUI(tile)
      // 始终订阅: 聚焦者大流, 其余小流
      subscribeTile(tile)
    })
    if (E.REMOTE_VIDEO_UNAVAILABLE) t.on(E.REMOTE_VIDEO_UNAVAILABLE, e => {
      const tile = tiles[e.userId]
      if (!tile) return
      delete tile.types[e.streamType]
      if (tile.playing[e.streamType]) {
        try { trtc.value.stopRemoteVideo({ userId: e.userId, streamType: e.streamType }) } catch (x) {}
        tile.playing[e.streamType] = false
      }
      tile.streamType = preferType(tile)
      updateTileUI(tile)
    })
    if (E.REMOTE_AUDIO_AVAILABLE) t.on(E.REMOTE_AUDIO_AVAILABLE, e => { const tile = tiles[e.userId]; if (tile) { tile.audio = true; updateTileUI(tile) } })
    if (E.REMOTE_AUDIO_UNAVAILABLE) t.on(E.REMOTE_AUDIO_UNAVAILABLE, e => { const tile = tiles[e.userId]; if (tile) { tile.audio = false; updateTileUI(tile) } })
  }

  function preferType(tile) {
    if (tile.types[TRTC.TYPE.STREAM_TYPE_MAIN]) return TRTC.TYPE.STREAM_TYPE_MAIN
    if (tile.types[TRTC.TYPE.STREAM_TYPE_SUB]) return TRTC.TYPE.STREAM_TYPE_SUB
    return null
  }

  function ensureTile(uid) {
    if (tiles[uid]) return tiles[uid]
    const tile = reactive({
      uid,
      types: {},
      playing: {},
      streamType: null,
      currentSmall: null,   // 当前订阅所用 small 配置 (true=小流, false=大流, null=未订阅)
      audio: false,
      muted: false,
      status: 'waiting',
      fullscreen: false,    // 是否全屏显示
      videoEl: null,        // VideoTile 组件 mounted 时注入 DOM 容器
      statusText: '等待推流',
      stats: null           // 拉流实时统计 (STATISTICS 事件写入: 分辨率/码率/帧率/丢包/RTT)
    })
    tiles[uid] = tile
    return tile
  }

  function setTileOffline(uid) {
    const tile = tiles[uid]
    if (!tile) return
    tile.status = 'offline'
    if (tile.streamType && tile.playing[tile.streamType]) {
      try { trtc.value.stopRemoteVideo({ userId: uid, streamType: tile.streamType }) } catch (x) {}
      tile.playing[tile.streamType] = false
    }
    // 离线时若是聚焦者, 清除聚焦
    if (focusedUid.value === uid) {
      focusedUid.value = null
      tile.fullscreen = false
    }
    tile.statusText = '离线'
  }

  function updateTileUI(tile) {
    let st
    if (tile.status === 'offline') st = '离线'
    else if (tile.streamType === TRTC.TYPE.STREAM_TYPE_MAIN) {
      st = (tile.playing[tile.streamType] && tile.currentSmall === false) ? '大流' : '小流'
    } else if (tile.streamType) st = '屏幕(辅流)'
    else st = '等待推流'
    tile.statusText = st + (tile.audio ? ' · 有声音' : '')
  }

  function shouldSubscribe(tile) {
    // 统一订阅所有有流的选手 (聚焦者大流, 其余小流)
    return !!tile.streamType
  }

  // 订阅 / 切换大流小流. TRTC 不支持动态改 option, 配置变化时需 stop 后重新 start.
  function subscribeTile(tile) {
    if (!tile.streamType) return
    if (!tile.videoEl) {
      // 容器还没 mount, 稍后 VideoTile mounted 会调 retrySubscribe
      return
    }
    const isFocused = focusedUid.value === tile.uid
    const small = !isFocused   // 聚焦者大流, 其余小流

    if (tile.playing[tile.streamType]) {
      if (tile.currentSmall === small) return   // 配置相同, 无需操作
      // 大流 ↔ 小流切换, 先停止当前订阅
      try { trtc.value.stopRemoteVideo({ userId: tile.uid, streamType: tile.streamType }) } catch (x) {}
      tile.playing[tile.streamType] = false
    }

    trtc.value.startRemoteVideo({ userId: tile.uid, streamType: tile.streamType, view: tile.videoEl, option: { small } })
      .then(() => {
        tile.playing[tile.streamType] = true
        tile.currentSmall = small
        tile.status = 'live'
        updateTileUI(tile)
      })
      .catch(e => log('⚠ 拉流失败 ' + tile.uid + ': ' + e.message))
  }

  function retrySubscribe(uid) {
    const tile = tiles[uid]
    if (tile && shouldSubscribe(tile)) subscribeTile(tile)
  }

  function unsubscribeTile(tile) {
    if (tile.streamType && tile.playing[tile.streamType]) {
      try { trtc.value.stopRemoteVideo({ userId: tile.uid, streamType: tile.streamType }) } catch (x) {}
      tile.playing[tile.streamType] = false
      tile.currentSmall = null
      tile.status = 'waiting'
      updateTileUI(tile)
    }
  }

  // 点击选手: 聚焦者全屏+大流, 其余网格+小流; 再次点击聚焦者则退出全屏
  function tileClick(tile) {
    if (focusedUid.value === tile.uid) {
      // 已聚焦 → 退出全屏, 切回小流
      focusedUid.value = null
      tile.fullscreen = false
      subscribeTile(tile)   // small 变化触发 大流→小流 重订阅
      updateTileUI(tile)
    } else {
      // 聚焦新选手: 旧聚焦者切回小流, 新聚焦者切大流+全屏
      const prev = focusedUid.value
      focusedUid.value = tile.uid
      if (prev && tiles[prev]) {
        tiles[prev].fullscreen = false
        subscribeTile(tiles[prev])   // 切回小流
        updateTileUI(tiles[prev])
      }
      tile.fullscreen = true
      subscribeTile(tile)            // 切大流
      updateTileUI(tile)
    }
  }

  function toggleMute(tile) {
    tile.muted = !tile.muted
    const v = tile.videoEl && tile.videoEl.querySelector('video')
    if (v) v.muted = tile.muted
    try { if (TRTC) trtc.value.muteRemoteAudio({ userId: tile.uid, muted: tile.muted }) } catch (x) {}
  }

  async function leave() {
    try {
      if (trtc.value) {
        // 清理所有远端订阅
        Object.values(tiles).forEach(t => {
          if (t.streamType && t.playing[t.streamType]) {
            try { trtc.value.stopRemoteVideo({ userId: t.uid, streamType: t.streamType }) } catch (x) {}
          }
        })
        await trtc.value.leaveRoom()
      }
    } catch (x) {}
    // 重置状态
    Object.keys(tiles).forEach(k => { delete tiles[k] })
    joined.value = false
    trtc.value = null
    focusedUid.value = null
    localStats.value = null
    setStatus('未连接', '')
  }

  return {
    trtc, joined, status, tiles, focusedUid, localStats,
    join, leave,
    ensureTile, retrySubscribe, subscribeTile, unsubscribeTile,
    tileClick, toggleMute, updateTileUI,
    setStatus
  }
}
