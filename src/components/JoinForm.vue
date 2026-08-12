<script setup>
import { ref, onMounted } from 'vue'
import { JUDGE_KEY } from '../composables/useConfig'
import { genUserSig, compressUserSig } from '../composables/useUserSig'
import { useLog } from '../composables/useLog'

const props = defineProps({
  initial: Object   // { room, userId, userSig, isJudge, judgeKey }
})
const emit = defineEmits(['join'])
const { log } = useLog()

const room = ref(props.initial.room)
const userId = ref(props.initial.userId)
const userSig = ref(props.initial.userSig)
const isJudge = ref(props.initial.isJudge)
const judgeKey = ref(props.initial.judgeKey)

function submit() {
  emit('join', {
    room: room.value.trim(),
    userId: userId.value.trim(),
    userSig: userSig.value.trim(),
    isJudge: isJudge.value,
    judgeKey: judgeKey.value.trim()
  })
}

/* ===== 组织者工具: 本地生成 UserSig (WebCrypto, 密钥不出浏览器) ===== */
const inpKey = ref('')
const chkRemember = ref(false)
const inpUsers = ref('')
const inpJudgeKeyTool = ref(JUDGE_KEY)
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
  const jkey = inpJudgeKeyTool.value.trim() || JUDGE_KEY
  if (jkey !== JUDGE_KEY) {
    log('⚠ 裁判口令与页面 JUDGE_KEY 不一致 (' + jkey + ' ≠ ' + JUDGE_KEY + '), 生成的裁判链接会被降级为选手!')
  }
  const sdkAppId = props.initial.sdkAppId
  const base = location.origin + location.pathname
  const lines = []
  for (const uid of users) {
    let sig = await genUserSig(sdkAppId, key, uid, expire)
    if (fmt === 'compress') sig = await compressUserSig(sig)
    const extra = (uid.toLowerCase().indexOf('judge') >= 0) ? '&judge=1&judgeKey=' + encodeURIComponent(jkey) : '&auto=1'
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
      // 退回 execCommand
      const ta = document.createElement('textarea')
      ta.value = outLinks.value
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy'); log('✅ 已复制全部链接') } catch (e) { log('⚠ 复制失败, 请手动全选复制') }
      document.body.removeChild(ta)
    })
}
</script>

<template>
  <section class="panel">
    <h2>进入比赛房间</h2>
    <label>房间号 (所有选手和裁判填同一个)</label>
    <input type="text" v-model="room" placeholder="例如 race1">
    <label>用户ID (每个选手/裁判唯一, 例如 player1 / judge)</label>
    <input type="text" v-model="userId" placeholder="player1">
    <label>UserSig (控制台「开发辅助工具→UserSig生成&校验」生成, 或下方本地工具批量生成)</label>
    <textarea v-model="userSig" rows="2" placeholder="粘贴 UserSig"></textarea>
    <div class="row">
      <label class="chk">
        <input type="checkbox" v-model="isJudge"> 我是裁判 (需口令)
      </label>
      <input type="text" v-model="judgeKey" placeholder="裁判口令" class="judge-key">
      <button class="btn primary" @click="submit">进房</button>
    </div>
    <div class="hint">
      也可用带参数链接一键进房:<br>
      选手: <code>?room=race1&userId=player1&userSig=xxxx</code><br>
      裁判: <code>?room=race1&userId=judge&userSig=xxxx&judge=1&judgeKey={{ JUDGE_KEY }}</code><br>
      选手可选 <code>&auto=1</code> 进房后自动弹出屏幕分享; 小流档位 <code>&small=120p</code> (默认 120p, 可选 240p/360p)<br>
      <span class="warn-text">裁判口令只发给裁判本人, 选手不知道口令无法进入裁判模式</span>
    </div>

    <hr>

    <details>
      <summary>🛠 组织者工具: 本地生成签名/链接 (密钥不出浏览器)</summary>
      <label>应用密钥 SecretKey (只在你的浏览器里算签名, 不会上传到任何服务器)</label>
      <input type="password" v-model="inpKey" placeholder="粘贴 SecretKey">
      <div class="row">
        <label class="chk">
          <input type="checkbox" v-model="chkRemember"> 记住密钥 (存本机浏览器 localStorage, 公共电脑勿勾)
        </label>
      </div>
      <label>用户ID (每行一个; 名字含 judge 的生成裁判链接, 其余生成选手链接)</label>
      <textarea v-model="inpUsers" rows="4" placeholder="judge&#10;player1&#10;player2"></textarea>
      <label>裁判口令 (裁判链接自动带上; 只发给裁判本人)</label>
      <input type="text" v-model="inpJudgeKeyTool" class="judge-key">
      <div class="hint">口令必须与页面源码里的 JUDGE_KEY 一致(当前: <b>{{ JUDGE_KEY }}</b>); 要改口令请先修改 src/composables/useConfig.js 的 JUDGE_KEY 再重新部署。</div>
      <div class="row">
        <label class="chk">有效期
          <select v-model="selExpire">
            <option value="86400">1 天</option>
            <option value="604800">7 天</option>
            <option value="2592000">30 天</option>
            <option value="15552000">180 天</option>
          </select>
        </label>
        <label class="chk">签名格式
          <select v-model="selFmt">
            <option value="compress">压缩 (控制台同款, 推荐)</option>
            <option value="std">标准</option>
          </select>
        </label>
        <button class="btn primary" @click="genLinks">生成链接</button>
        <button class="btn ghost" @click="copyAll">复制全部</button>
      </div>
      <textarea v-model="outLinks" rows="6" readonly placeholder="生成的带签名链接会出现在这里, 复制后分别发给对应选手"></textarea>
      <div class="hint">{{ genHint }}</div>
    </details>
  </section>
</template>

<style scoped>
h2 { font-size: 15px; font-weight: 600; margin-bottom: 14px; }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 14px; }
.judge-key { max-width: 220px; }
.chk { display: inline-flex; gap: 7px; align-items: center; font-size: 13px; color: var(--fg-dim); cursor: pointer; }
.chk input[type="checkbox"], .chk select { width: auto; }
.chk select { max-width: 200px; }
.hint { font-size: 12.5px; color: var(--fg-dim); margin-top: 10px; line-height: 1.8; }
.warn-text { color: var(--warn); }
hr { margin: 16px 0; border: none; border-top: 1px solid var(--line-soft); }
details { margin-top: 4px; }
summary { cursor: pointer; font-size: 13px; color: var(--acc); user-select: none; }
details[open] summary { margin-bottom: 8px; }
</style>
