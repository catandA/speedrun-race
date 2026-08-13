// 全局配置常量 + URL 参数解析

export const DEFAULTS = { sdkAppId: 1600156752, room: 'race1' }

// 裁判凭据签名盐: 源码里有(防大众用户), 但绝不在 UI 上显示。
// 组织者生成裁判链接时用此盐生成 HMAC 签名 token 放进 URL, 裁判拿链接即用, 无需口令。
// 进房时前端用此盐验证 token, 选手无盐无法自行构造合法裁判链接。
// 想换盐需改源码重新部署, 但盐是长期密钥不必常改 —— 不再有"改口令要重新部署"的问题。
export const JUDGE_SALT = 'sr-race-judge-2026-7f3a9e1b4c8d'

// 小流编码参数: 640×480 / 500kbps / 15fps
// 落在计费 SD 档(≤640×480, 300-900kbps) 14元/千分钟。
// 用 500 而非 900: 留余量防网络波动实际码率超 900 掉到 HD 档(28元); 屏幕预览够清晰。
export const SMALL_PROFILE = { width: 640, height: 480, bitrate: 500, frameRate: 15 }

export function parseConfig() {
  const qs = new URLSearchParams(location.search)
  return {
    sdkAppId: Number(qs.get('sdkAppId') || DEFAULTS.sdkAppId),
    room: (qs.get('room') || DEFAULTS.room).trim(),
    userId: (qs.get('userId') || '').trim(),
    userSig: (qs.get('userSig') || '').trim(),
    isJudge: qs.get('judge') === '1',
    judgeToken: (qs.get('jt') || '').trim(),
    autoShare: qs.get('auto') === '1',
    small: qs.get('small') !== '0'   // 默认开小流; small=0 关闭。具体编码参数见 SMALL_PROFILE
  }
}
