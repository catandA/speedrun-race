<script setup>
import { ref, reactive, onMounted } from 'vue'
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

// 字段级错误 (P2: 错误放字段旁, 不只倒进日志)
const errors = reactive({ room: '', userId: '', userSig: '', judgeToken: '' })
const joining = ref(false)   // 进房 loading

function validateField(field) {
  if (field === 'room') errors.room = room.value.trim() ? '' : '房间号不能为空'
  if (field === 'userId') errors.userId = userId.value.trim() ? '' : '用户 ID 不能为空'
  if (field === 'userSig') errors.userSig = userSig.value.trim() ? '' : 'UserSig 不能为空'
  if (field === 'judgeToken') errors.judgeToken = (isJudge.value && !judgeToken.value.trim()) ? '裁判需凭据' : ''
}

function validateAll() {
  ;['room', 'userId', 'userSig'].forEach(validateField)
  if (isJudge.value) validateField('judgeToken')
  return !errors.room && !errors.userId && !errors.userSig && !errors.judgeToken
}

async function submit() {
  if (!validateAll()) { log('⚠ 请修正表单错误'); return }
  if (joining.value) return
  joining.value = true
  emit('join', {
    room: room.value.trim(),
    userId: userId.value.trim(),
    userSig: userSig.value.trim(),
    isJudge: isJudge.value,
    judgeToken: judgeToken.value.trim()
  })
  // 进房是异步, App.vue 的 onJoin 会 await trtcJoin; 这里给一个保底释放窗口
  setTimeout(() => { joining.value = false }, 4000)
}

/* ===== 组织者工具: 本地生成 UserSig + 裁判凭据 (WebCrypto, 密钥不出浏览器) ===== */
const inpKey = ref('')
const chkRemember = ref(false)
const inpUsers = ref('')
const selExpire = ref('15552000')
const selFmt = ref('compress')
const outLinks = ref('')
const genHint = ref('')
const genLoading = ref(false)   // 生成链接 loading

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
  if (genLoading.value) return
  const key = inpKey.value.trim()
  if (!key) { log('⚠ 请粘贴 SecretKey'); return }
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    log('⚠ 密钥为 64 位 hex。若控制台显示的是「公钥/私钥」则处于非对称模式, HMAC 签名不适用, 需在「应用信息→快速上手→第二步」切回 HMAC-SHA256')
  }
  if (chkRemember.value) { try { localStorage.setItem('trtcKey', key) } catch (x) {} }
  const users = inpUsers.value.split('\n').map(s => s.trim()).filter(Boolean)
  if (!users.length) { log('⚠ 请填写用户ID'); return }
  genLoading.value = true
  const expire = Number(selExpire.value)
  const fmt = selFmt.value || 'compress'
  const roomVal = room.value.trim() || 'race1'
  const sdkAppId = props.initial.sdkAppId
  const base = location.origin + location.pathname
  const lines = []
  try {
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
  } catch (e) {
    log('❌ 生成失败: ' + (e && e.message ? e.message : e))
  } finally {
    genLoading.value = false
  }
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
      <span class="mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M13.5 1 4 13.2c-.5.6-.1 1.5.7 1.5H11l-1.6 7.7c-.2.9.9 1.4 1.4.7L20 10.9c.5-.6.1-1.5-.7-1.5H13l.5-7.4c.1-.8-.8-1.3-1.3-.6z"/></svg>
      </span>
      <div>
        <h2>进入直播间</h2>
        <p class="subtitle">填写房间信息加入比赛直播</p>
      </div>
    </header>

    <div class="grid-2">
      <div class="field">
        <label for="f-room">房间号</label>
        <input id="f-room" type="text" v-model="room" :class="{ err: errors.room }"
          placeholder="例如 race1" @blur="validateField('room')" aria-describedby="err-room">
        <span class="field-err" id="err-room" v-if="errors.room">{{ errors.room }}</span>
      </div>
      <div class="field">
        <label for="f-uid">用户 ID</label>
        <input id="f-uid" type="text" v-model="userId" :class="{ err: errors.userId }"
          placeholder="例如 player1 / judge" @blur="validateField('userId')" aria-describedby="err-uid">
        <span class="field-err" id="err-uid" v-if="errors.userId">{{ errors.userId }}</span>
      </div>
    </div>

    <div class="field">
      <label for="f-sig">UserSig</label>
      <textarea id="f-sig" v-model="userSig" rows="2" :class="{ err: errors.userSig }"
        placeholder="粘贴控制台生成的 UserSig" @blur="validateField('userSig')" aria-describedby="err-sig"></textarea>
      <span class="field-err" id="err-sig" v-if="errors.userSig">{{ errors.userSig }}</span>
    </div>

    <div class="field">
      <label>身份角色</label>
      <div class="seg">
        <button type="button" class="seg-btn" :class="{ active: !isJudge }" @click="isJudge = false">
          选手
        </button>
        <button type="button" class="seg-btn" :class="{ active: isJudge }" @click="isJudge = true">
          裁判
        </button>
      </div>
    </div>

    <div class="field" v-if="isJudge">
      <label for="f-jt">裁判凭据 jt</label>
      <input id="f-jt" type="text" v-model="judgeToken" :class="{ err: errors.judgeToken }"
        placeholder="由组织者工具生成的签名凭据" @blur="validateField('judgeToken')" aria-describedby="err-jt">
      <span class="field-err" id="err-jt" v-if="errors.judgeToken">{{ errors.judgeToken }}</span>
    </div>

    <button class="btn primary submit" :disabled="joining" @click="submit">
      <span class="spin" v-if="joining" aria-hidden="true"></span>
      {{ joining ? '进房中…' : '进入直播间' }}
    </button>

    <div class="hint-box">
      <span class="hint-k">链接进房</span>
      <div>
        选手: <code>?room=race1&userId=player1&userSig=xxxx</code><br>
        裁判: <code>?room=race1&userId=judge&userSig=xxxx&judge=1&jt=签名凭据</code><br>
        选手可选 <code>&auto=1</code> 自动弹屏幕分享; 小流档位 <code>&small=120p</code> (默认 120p, 可选 240p/360p)
      </div>
    </div>
    <p class="warn-text">▲ 裁判链接由组织者用下方工具生成, 自带签名凭据; 选手无法自行进入裁判模式</p>

    <div class="divider"></div>

    <details class="org-tool">
      <summary>
        <span class="caret">▸</span> 组织者工具: 本地生成签名 / 链接
        <span class="lock-tip">密钥不出浏览器</span>
      </summary>

      <div class="org-body">
        <div class="field">
          <label for="o-key">应用密钥 SecretKey</label>
          <input id="o-key" type="password" v-model="inpKey" placeholder="粘贴 SecretKey (仅本地用于签名, 不上传)">
        </div>
        <label class="chk">
          <input type="checkbox" v-model="chkRemember"> 记住密钥 (存本机 localStorage, 公共电脑勿勾)
        </label>

        <div class="field">
          <label for="o-users">用户 ID 列表 (每行一个)</label>
          <textarea id="o-users" v-model="inpUsers" rows="4" placeholder="judge&#10;player1&#10;player2"></textarea>
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
          <button class="btn primary" :disabled="genLoading" @click="genLinks">
            <span class="spin" v-if="genLoading" aria-hidden="true"></span>
            {{ genLoading ? '生成中…' : '生成链接' }}
          </button>
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
.join-panel { max-width: 600px; padding: 22px 24px 20px; }

.join-head { display: flex; align-items: center; gap: 11px; margin-bottom: 18px; }
.mark {
  display: grid; place-items: center;
  width: 34px; height: 34px;
  background: var(--go); color: #04140a;
  border-radius: var(--radius);
  box-shadow: 0 0 18px -6px var(--go);
  flex-shrink: 0;
}
.join-head h2 { font-size: 17px; font-weight: 800; letter-spacing: 0.4px; }
.subtitle { font-size: 11px; color: var(--fg-mute); margin-top: 2px; letter-spacing: 0.3px; }

.field { margin-top: 2px; }
.field-hint { font-size: 11px; color: var(--fg-mute); margin-top: 5px; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 540px) { .grid-2 { grid-template-columns: 1fr; } }

/* 分段切换 */
.seg {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
  background: var(--inset);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 4px;
}
.seg-btn {
  padding: 8px 12px; font-size: 13px; font-weight: 600;
  color: var(--fg-dim); background: transparent;
  border: none; border-radius: var(--radius-sm); cursor: pointer;
  transition: color 0.1s, background 0.1s;
  font-family: inherit;
}
.seg-btn:hover { color: var(--fg); }
.seg-btn.active { color: var(--go); background: var(--go-dim); }
.seg-btn:focus-visible { outline: 2px solid var(--go); outline-offset: 2px; }

.submit { width: 100%; margin-top: 16px; padding: 12px; font-size: 14px; }

/* loading 转圈 */
.spin {
  width: 13px; height: 13px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spin { animation-duration: 2s; } }

.hint-box {
  display: flex; gap: 10px;
  margin-top: 16px;
  padding: 10px 12px;
  background: var(--inset);
  border: 1px solid var(--border);
  border-left: 2px solid var(--go);
  border-radius: var(--radius);
  font-size: 11.5px; color: var(--fg-dim); line-height: 1.8;
}
.hint-k { color: var(--go); font-weight: 700; letter-spacing: 0.5px; flex-shrink: 0; }
.warn-text { font-size: 11px; color: var(--split); margin-top: 9px; }

.divider { height: 1px; background: var(--border); margin: 20px 0 2px; }

/* 组织者折叠工具 */
.org-tool { margin-top: 6px; }
.org-tool > summary {
  display: flex; align-items: center; gap: 8px;
  cursor: pointer; user-select: none;
  list-style: none;
  font-size: 12px; font-weight: 600; color: var(--fg-dim);
  padding: 5px 0;
  transition: color 0.1s;
}
.org-tool > summary::-webkit-details-marker { display: none; }
.org-tool > summary:hover { color: var(--fg); }
.caret { color: var(--go); width: 10px; display: inline-block; transition: transform 0.1s; }
.org-tool[open] .caret { transform: rotate(90deg); }
.lock-tip { margin-left: auto; font-size: 10px; font-weight: 600; color: var(--go); background: var(--go-dim); padding: 2px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-acc); }
.org-tool[open] > summary { margin-bottom: 12px; }

.org-body {
  padding: 14px;
  background: var(--inset);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin: 12px 0; }
.chk { display: inline-flex; gap: 7px; align-items: center; font-size: 12px; color: var(--fg-dim); cursor: pointer; text-transform: none; letter-spacing: 0; font-weight: 400; margin: 10px 0 0; }
.chk input[type="checkbox"] { width: 14px; height: 14px; accent-color: var(--go); }
.inline-lbl { display: inline-flex; flex-direction: column; gap: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--fg-dim); margin: 0; }
.inline-lbl select { width: auto; min-width: 130px; padding: 7px 9px; }

.field label { margin-top: 12px; }
.field:first-child label, .grid-2 .field label { margin-top: 0; }
</style>
