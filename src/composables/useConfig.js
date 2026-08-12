// 全局配置常量 + URL 参数解析

export const DEFAULTS = { sdkAppId: 1600156752, room: 'race1' }

// 裁判凭据签名盐: 源码里有(防大众用户), 但绝不在 UI 上显示。
// 组织者生成裁判链接时用此盐生成 HMAC 签名 token 放进 URL, 裁判拿链接即用, 无需口令。
// 进房时前端用此盐验证 token, 选手无盐无法自行构造合法裁判链接。
// 想换盐需改源码重新部署, 但盐是长期密钥不必常改 —— 不再有"改口令要重新部署"的问题。
export const JUDGE_SALT = 'sr-race-judge-2026-7f3a9e1b4c8d'

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
    small: qs.get('small') || '120p'
  }
}
