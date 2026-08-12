import { ref, reactive } from 'vue'
import { useLog } from './useLog'

// 单例状态 (整个应用共享一个 trtc 客户端)
const trtc = ref(null)
const joined = ref(false)
const status = reactive({ text: '未连接', cls: '' })
const tiles = reactive({})        // uid -> tile 对象 (reactive)
const judgeMode = ref('all')       // all | focus
const focusedUid = ref(null)

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

    if (!cfg.isJudge) return

    // 裁判: 远端用户/流管理
    if (E.REMOTE_USER_ENTER) t.on(E.REMOTE_USER_ENTER, e => ensureTile(e.userId))
    if (E.REMOTE_USER_EXIT) t.on(E.REMOTE_USER_EXIT, e => setTileOffline(e.userId))
    if (E.REMOTE_VIDEO_AVAILABLE) t.on(E.REMOTE_VIDEO_AVAILABLE, e => {
      const tile = ensureTile(e.userId)
      tile.types[e.streamType] = true
      tile.streamType = preferType(tile)
      updateTileUI(tile)
      if (judgeMode.value === 'all' || focusedUid.value === e.userId) subscribeTile(tile)
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
      audio: false,
      muted: false,
      status: 'waiting',
      videoEl: null,      // VideoTile 组件 mounted 时注入 DOM 容器
      statusText: '等待推流'
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
    tile.statusText = '离线'
  }

  function updateTileUI(tile) {
    let st
    if (tile.status === 'offline') st = '离线'
    else if (tile.streamType === TRTC.TYPE.STREAM_TYPE_MAIN) {
      st = (tile.playing[tile.streamType] && judgeMode.value === 'focus' && focusedUid.value === tile.uid) ? '大流' : '小流'
    } else if (tile.streamType) st = '屏幕(辅流)'
    else st = '等待推流'
    tile.statusText = st + (tile.audio ? ' · 有声音' : '')
  }

  function shouldSubscribe(tile) {
    if (!tile.streamType) return false
    if (judgeMode.value === 'all') return true
    return focusedUid.value === tile.uid
  }

  function subscribeTile(tile) {
    if (!tile.streamType) return
    if (!tile.videoEl) {
      // 容器还没 mount, 稍后 VideoTile mounted 会调 retrySubscribe
      return
    }
    const small = !(judgeMode.value === 'focus' && focusedUid.value === tile.uid)
    if (!tile.playing[tile.streamType]) {
      trtc.value.startRemoteVideo({ userId: tile.uid, streamType: tile.streamType, view: tile.videoEl, option: { small } })
        .then(() => {
          tile.playing[tile.streamType] = true
          tile.status = 'live'
          updateTileUI(tile)
        })
        .catch(e => log('⚠ 拉流失败 ' + tile.uid + ': ' + e.message))
    }
  }

  function retrySubscribe(uid) {
    const tile = tiles[uid]
    if (tile && shouldSubscribe(tile)) subscribeTile(tile)
  }

  function unsubscribeTile(tile) {
    if (tile.streamType && tile.playing[tile.streamType]) {
      try { trtc.value.stopRemoteVideo({ userId: tile.uid, streamType: tile.streamType }) } catch (x) {}
      tile.playing[tile.streamType] = false
      tile.status = 'waiting'
      updateTileUI(tile)
    }
  }

  function tileClick(tile) {
    if (judgeMode.value === 'all') {
      // 全览: 点击全屏单看
      tile.fullscreen = !tile.fullscreen
      Object.values(tiles).forEach(x => { if (x !== tile) x.fullscreen = false })
    } else {
      // 专注: 切换关注
      const prev = focusedUid.value
      focusedUid.value = tile.uid
      if (prev && tiles[prev]) unsubscribeTile(tiles[prev])
      subscribeTile(tile)
      updateTileUI(tile)
    }
  }

  function toggleMute(tile) {
    tile.muted = !tile.muted
    const v = tile.videoEl && tile.videoEl.querySelector('video')
    if (v) v.muted = tile.muted
    try { if (TRTC) trtc.value.muteRemoteAudio({ userId: tile.uid, muted: tile.muted }) } catch (x) {}
  }

  function toggleJudgeMode() {
    judgeMode.value = judgeMode.value === 'all' ? 'focus' : 'all'
    focusedUid.value = null
    Object.values(tiles).forEach(t => {
      t.fullscreen = false
      if (t.streamType) {
        if (judgeMode.value === 'all') subscribeTile(t)
        else unsubscribeTile(t)
      }
    })
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
    judgeMode.value = 'all'
    focusedUid.value = null
    setStatus('未连接', '')
  }

  return {
    trtc, joined, status, tiles, judgeMode, focusedUid,
    join, leave,
    ensureTile, retrySubscribe, subscribeTile, unsubscribeTile,
    tileClick, toggleMute, toggleJudgeMode, updateTileUI,
    setStatus
  }
}
