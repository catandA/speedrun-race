// UserSig 生成 / 校验 / 压缩 / 解压 — 与原 index.html 逻辑等价, WebCrypto 本地计算

// 兼容控制台 URL-safe base64 (* - _) 与标准 base64 (+ / =)
function tryParseUserSig(sig) {
  try {
    return JSON.parse(atob(sig.replace(/\*/g, '+').replace(/-/g, '/').replace(/_/g, '=')))
  } catch (e) { return null }
}

// 控制台压缩格式 (eJx 开头, zlib, URL-safe base64) — 优先 pako, 退回 DecompressionStream
export async function inflateUserSig(sig) {
  try {
    const b = sig.replace(/\*/g, '+').replace(/-/g, '/').replace(/_/g, '=')
    const bytes = Uint8Array.from(atob(b), c => c.charCodeAt(0))
    if (window.pako) return JSON.parse(window.pako.inflate(bytes, { to: 'string' }))
    const ds = new DecompressionStream('deflate')
    const stream = new Blob([bytes]).stream().pipeThrough(ds)
    const buf = await new Response(stream).arrayBuffer()
    return JSON.parse(new TextDecoder().decode(buf))
  } catch (e) { return null }
}

// 本地预检: 解出 identifier/sdkappid/有效期, 提前拦截常见错误
export async function precheckUserSig(sig, uid, appid) {
  const p = tryParseUserSig(sig) || await inflateUserSig(sig)
  if (!p) return ['UserSig 无法解析 (标准/压缩格式均失败), 请重新生成']
  const errs = []
  if (p['TLS.identifier'] !== uid) {
    errs.push('UserSig 绑定的用户ID是 "' + p['TLS.identifier'] + '", 与填写的 "' + uid + '" 不一致 — UserSig 与 userId 必须一一对应, 请按用户ID分别生成')
  }
  if (Number(p['TLS.sdkappid']) !== Number(appid)) {
    errs.push('UserSig 里的 SDKAppID (' + p['TLS.sdkappid'] + ') 与页面 (' + appid + ') 不一致')
  }
  if (Number(p['TLS.time']) + Number(p['TLS.expire']) < Math.floor(Date.now() / 1000)) {
    errs.push('UserSig 已过期, 请重新生成')
  }
  return errs
}

// HMAC-SHA256 签名 (与官方 tls-sig-api-v2 一致, 输入串用 \n 换行)
export async function genUserSig(sdkAppId, key, userId, expire) {
  const now = Math.floor(Date.now() / 1000)
  const input = 'TLS.identifier:' + userId + '\nTLS.sdkappid:' + sdkAppId + '\nTLS.time:' + now + '\nTLS.expire:' + expire + '\n'
  const enc = new TextEncoder()
  const keyBuf = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sigBuf = await crypto.subtle.sign('HMAC', keyBuf, enc.encode(input))
  const sig = btoa(String.fromCharCode.apply(null, new Uint8Array(sigBuf)))
  const payload = {
    'TLS.ver': '2.0',
    'TLS.identifier': userId,
    'TLS.sdkappid': sdkAppId,
    'TLS.expire': expire,
    'TLS.time': now,
    'TLS.sig': sig
  }
  return btoa(JSON.stringify(payload))
}

// 压缩为控制台同款格式 (zlib + URL-safe base64), 失败退回标准格式
export async function compressUserSig(stdSig) {
  try {
    const json = JSON.stringify(JSON.parse(atob(stdSig.replace(/\*/g, '+').replace(/-/g, '/').replace(/_/g, '='))))
    const bytes = new TextEncoder().encode(json)
    let out
    if (window.pako) {
      out = btoa(String.fromCharCode.apply(null, window.pako.deflate(bytes)))
    } else {
      const cs = new CompressionStream('deflate')
      const stream = new Blob([bytes]).stream().pipeThrough(cs)
      const buf = await new Response(stream).arrayBuffer()
      out = btoa(String.fromCharCode.apply(null, new Uint8Array(buf)))
    }
    return out.replace(/\+/g, '*').replace(/\//g, '-').replace(/=/g, '_')
  } catch (e) { return stdSig }
}
