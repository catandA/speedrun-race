// 全局配置常量 + URL 参数解析 (与原 index.html 等价)

export const DEFAULTS = { sdkAppId: 1600156752, room: 'race1' }

// 裁判口令: 勾选"我是裁判"或 URL 带 judge=1 时必须提供, 否则降级为选手。
// 防君子轻量防线, 口令在源码里, 认真逆向可绕过。赛前可改。
export const JUDGE_KEY = 'impig'

export function parseConfig() {
  const qs = new URLSearchParams(location.search)
  return {
    sdkAppId: Number(qs.get('sdkAppId') || DEFAULTS.sdkAppId),
    room: (qs.get('room') || DEFAULTS.room).trim(),
    userId: (qs.get('userId') || '').trim(),
    userSig: (qs.get('userSig') || '').trim(),
    isJudge: qs.get('judge') === '1',
    autoShare: qs.get('auto') === '1',
    small: qs.get('small') || '120p',
    judgeKey: (qs.get('judgeKey') || '').trim()
  }
}
