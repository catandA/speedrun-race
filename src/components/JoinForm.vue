<script setup>
import { ref, onMounted } from 'vue'
import { JUDGE_SALT } from '../composables/useConfig'
import { genUserSig, compressUserSig, genJudgeToken } from '../composables/useUserSig'
import { useLog } from '../composables/useLog'

const props = defineProps({
  initial: Object   // { room, userId, userSig, isJudge, judgeToken }
})
const emit = defineEmits(['join'])
const { log } = useLog()

const room = ref(props.initial.room)
const userId = ref(props.initial.userId)
const userSig = ref(props.initial.userSig)
const isJudge = ref(props.initial.isJudge)
const judgeToken = ref(props.initial.judgeToken)

function submit() {
  emit('join', {
    room: room.value.trim(),
    userId: userId.value.trim(),
    userSig: userSig.value.trim(),
    isJudge: isJudge.value,
    judgeToken: judgeToken.value.trim()
  })
}

/* ===== 组织者工具: 本地生成 UserSig + 裁判凭据 (WebCrypto, 密钥不出浏览器) ===== */
const inpKey = ref('')
const chkRemember = ref(false)
const inpUsers = ref('')
const selExpire = ref('15552000')
const selFmt = ref('compress')
const outLinks = ref('')
const genHint = ref('')

onMounted(() => {
  try {
    const savedKey = localStorage.getItem('trtcKey')
    if (savedKey) {
      inpKey.value = savedKey
      chkRemember.value = true
      log('ℹ 已自动填入本机记住的密钥 (勾选了「记住密钥」)。若控制台校验失败, 请取消勾选, 重新从控制台复制新密钥粘贴')
    }
  } catch (x) {}
})

async function genLinks() {
  const key = inpKey.value.trim()
  if (!key) { log('⚠ 请粘贴 SecretKey'); return }
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    log('⚠ 密钥为 64 位 hex。若控制台显示的是「公钥/私钥」则处于非对称模式, HMAC 签名不适用, 需在「应用信息→快速上手→第二步」切回 HMAC-SHA256')
  }
  if (chkRemember.value) { try { localStorage.setItem('trtcKey', key) } catch (x) {} }
  const users = inpUsers.value.split('\n').map(s => s.trim()).filter(Boolean)
  if (!users.length) { log('⚠ 请填写用户ID'); return }
  const expire = Number(selExpire.value)
  const fmt = selFmt.value || 'compress'
  const roomVal = room.value.trim() || 'race1'
  const sdkAppId = props.initial.sdkAppId
  const base = location.origin + location.pathname
  const lines = []
  for (const uid of users) {
    let sig = await genUserSig(sdkAppId, key, uid, expire)
    if (fmt === 'compress') sig = await compressUserSig(sig)
    let extra
    if (uid.toLowerCase().indexOf('judge') >= 0) {
      // 裁判: 生成 HMAC 签名凭据, 放进 URL; 裁判拿链接即用, 无需口令
      const jt = await genJudgeToken(JUDGE_SALT, uid, expire)
      extra = '&judge=1&jt=' + encodeURIComponent(jt)
    } else {
      extra = '&auto=1'
    }
    lines.push(base + '?room=' + encodeURIComponent(roomVal) + '&userId=' + encodeURIComponent(uid) + '&userSig=' + encodeURIComponent(sig) + extra)
  }
  outLinks.value = lines.join('\n')
  genHint.value = '已生成 ' + lines.length + ' 条链接, 有效期 ' + (expire / 86400) + ' 天。链接含签名, 只发给对应选手本人。'
  log('✅ 已生成 ' + lines.length + ' 条链接 (有效期 ' + (expire / 86400) + ' 天)')
}

function copyAll() {
  if (!outLinks.value) return
  navigator.clipboard.writeText(outLinks.value)
    .then(() => log('✅ 已复制全部链接'))
    .catch(() => {
      const ta = document.createElement('textarea')
      ta.value = outLinks.value
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy'); log('✅ 已复制全部链接') } catch (e) { log('⚠ 复制失败, 请手动全选复制') }
      document.body.removeChild(ta)
    })
}
</script>

<template>
  <section class="panel join-panel">
    <header class="join-head">
      <span class="logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
          <path d="M13 2 4.5 13.2a.8.8 0 0 0 .63 1.3H10l-1.4 7.1a.45.45 0 0 0 .8.4L19 10.8a.8.8 0 0 0-.63-1.3H13z" fill="#05121f"/>
        </svg>
      </span>
      <div>
        <h2>进入直播间</h2>
        <p class="subtitle">填写房间信息以加入比赛直播</p>
      </div>
    </header>

    <div class="grid-2">
      <div class="field">
        <label>房间号</label>
        <input type="text" v-model="room" placeholder="例如 race1">
      </div>
      <div class="field">
        <label>用户 ID</label>
        <input type="text" v-model="userId" placeholder="例如 player1 / judge">
      </div>
    </div>

    <div class="field">
      <label>UserSig</label>
      <textarea v-model="userSig" rows="2" placeholder="粘贴控制台生成的 UserSig"></textarea>
    </div>

    <div class="field">
      <label>身份角色</label>
      <div class="seg">
        <button type="button" class="seg-btn" :class="{ active: !isJudge }" @click="isJudge = false">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14h-4V6a2 2 0 0 0-4 0v8H8a2 2 0 0 0 0 4h12a2 2 0 0 0 0-4z"/></svg>
          选手
        </button>
        <button type="button" class="seg-btn" :class="{ active: isJudge }" @click="isJudge = true">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.4 7.7 8 10 4.6-2.3 8-5 8-10V6z"/></svg>
          裁判 <span class="need">需凭据</span>
        </button>
      </div>
    </div>

    <div class="field" v-if="isJudge">
      <label>裁判凭据 jt</label>
      <input type="text" v-model="judgeToken" placeholder="由组织者工具生成的签名凭据">
    </div>

    <button class="btn primary submit" @click="submit">
      进入直播间
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </button>

    <div class="hint-box">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      <div>
        也可用带参数链接一键进房:<br>
        选手: <code>?room=race1&userId=player1&userSig=xxxx</code><br>
        裁判: <code>?room=race1&userId=judge&userSig=xxxx&judge=1&jt=签名凭据</code><br>
        选手可选 <code>&auto=1</code> 进房后自动弹出屏幕分享; 小流档位 <code>&small=120p</code> (默认 120p, 可选 240p/360p)
      </div>
    </div>
    <p class="warn-text">裁判链接由组织者用下方工具生成, 自带签名凭据; 选手无法自行进入裁判模式</p>

    <div class="divider"></div>

    <details class="org-tool">
      <summary>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2-2z"/></svg>
        组织者工具: 本地生成签名 / 链接
        <span class="lock-tip">密钥不出浏览器</span>
      </summary>

      <div class="org-body">
        <div class="field">
          <label>应用密钥 SecretKey</label>
          <input type="password" v-model="inpKey" placeholder="粘贴 SecretKey (仅本地用于签名, 不上传)">
        </div>
        <label class="chk">
          <input type="checkbox" v-model="chkRemember"> 记住密钥 (存本机 localStorage, 公共电脑勿勾)
        </label>

        <div class="field">
          <label>用户 ID 列表 (每行一个)</label>
          <textarea v-model="inpUsers" rows="4" placeholder="judge&#10;player1&#10;player2"></textarea>
          <p class="field-hint">名字含 <code>judge</code> 的生成裁判链接, 其余生成选手链接</p>
        </div>

        <div class="row">
          <label class="inline-lbl">有效期
            <select v-model="selExpire">
              <option value="86400">1 天</option>
              <option value="604800">7 天</option>
              <option value="2592000">30 天</option>
              <option value="15552000">180 天</option>
            </select>
          </label>
          <label class="inline-lbl">签名格式
            <select v-model="selFmt">
              <option value="compress">压缩 (推荐)</option>
              <option value="std">标准</option>
            </select>
          </label>
        </div>

        <div class="row">
          <button class="btn primary" @click="genLinks">生成链接</button>
          <button class="btn ghost" @click="copyAll">复制全部</button>
        </div>

        <div class="field">
          <textarea v-model="outLinks" rows="6" readonly placeholder="生成的带签名链接会出现在这里, 复制后分别发给对应选手"></textarea>
          <p class="field-hint">{{ genHint }}</p>
        </div>
      </div>
    </details>
  </section>
</template>

<style scoped>
.join-panel { max-width: 640px; padding: 26px 28px 24px; }

.join-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.join-head .logo {
  display: grid; place-items: center;
  width: 38px; height: 38px; border-radius: 11px;
  background: var(--acc-grad);
  box-shadow: 0 6px 18px var(--acc-glow), inset 0 1px 0 rgba(255,255,255,0.35);
  flex-shrink: 0;
}
.join-head h2 { font-size: 19px; font-weight: 800; letter-spacing: 0.3px; }
.subtitle { font-size: 12.5px; color: var(--fg-mute); margin-top: 1px; }

.field { margin-top: 4px; }
.field + .field { margin-top: 4px; }
.field-hint { font-size: 11.5px; color: var(--fg-mute); margin-top: 6px; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 540px) { .grid-2 { grid-template-columns: 1fr; } }

/* 分段切换 */
.seg {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  background: var(--inset);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 5px;
}
.seg-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 9px 12px; font-size: 13.5px; font-weight: 600;
  color: var(--fg-dim); background: transparent;
  border: none; border-radius: var(--radius-xs); cursor: pointer;
  transition: color 0.15s, background 0.15s, box-shadow 0.15s;
}
.seg-btn:hover { color: var(--fg); }
.seg-btn.active {
  color: var(--acc);
  background: var(--acc-soft);
  box-shadow: inset 0 0 0 1px var(--border-acc);
}
.seg-btn .need { font-size: 10.5px; color: var(--fg-mute); font-weight: 500; }

.submit { width: 100%; margin-top: 18px; padding: 13px; font-size: 15px; }

.hint-box {
  display: flex; gap: 10px;
  margin-top: 18px;
  padding: 12px 14px;
  background: var(--inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 12px; color: var(--fg-dim); line-height: 1.8;
}
.hint-box svg { flex-shrink: 0; margin-top: 2px; color: var(--acc); }
.warn-text { font-size: 11.5px; color: var(--warn); margin-top: 10px; }

.divider { height: 1px; background: var(--border); margin: 22px 0 4px; }

/* 组织者折叠工具 */
.org-tool { margin-top: 8px; }
.org-tool > summary {
  display: flex; align-items: center; gap: 8px;
  cursor: pointer; user-select: none;
  list-style: none;
  font-size: 13.5px; font-weight: 600; color: var(--fg-dim);
  padding: 6px 0;
  transition: color 0.15s;
}
.org-tool > summary::-webkit-details-marker { display: none; }
.org-tool > summary:hover { color: var(--fg); }
.org-tool > summary svg { color: var(--acc); }
.lock-tip { margin-left: auto; font-size: 10.5px; font-weight: 500; color: var(--ok); background: rgba(52,211,153,0.12); padding: 3px 9px; border-radius: 20px; }
.org-tool[open] > summary { margin-bottom: 14px; }

.org-body {
  padding: 16px 16px 4px;
  background: var(--inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin: 14px 0; }
.chk { display: inline-flex; gap: 7px; align-items: center; font-size: 12.5px; color: var(--fg-dim); cursor: pointer; text-transform: none; letter-spacing: 0; font-weight: 400; margin: 12px 0 0; }
.chk input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--acc); }
.inline-lbl { display: inline-flex; flex-direction: column; gap: 5px; font-size: 11px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; color: var(--fg-dim); margin: 0; }
.inline-lbl select { width: auto; min-width: 140px; padding: 8px 10px; }

/* field 内 label 间距: 紧贴上面 */
.field label { margin-top: 14px; }
.field:first-child label, .grid-2 .field label { margin-top: 0; }
</style>
