#!/usr/bin/env node
/**
 * 速通直播间页面自检脚本 (零依赖, 仅 node 内置模块)
 *
 * 用法:  node verify.js [index.html路径, 默认 index.html]
 *
 * 检查项:
 *   1. 两个 <script> 块语法
 *   2. 裁判口令逻辑: 错误口令降级选手 / 正确口令进裁判 / 组织者工具链接区分
 *   3. 页面内 genUserSig 与 HMAC-SHA256 参考算法一致性 (用固定测试密钥, 不涉真实密钥)
 *
 * 赛前改完 JUDGE_KEY 后跑一遍, 全 PASS 再发链接。
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

const htmlPath = process.argv[2] || 'index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

let pass = 0, fail = 0;
const check = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ': ' + m); c ? pass++ : fail++; };

/* ---------- 1. 语法 ---------- */
if (blocks.length < 2) { console.error('FAIL: script 块数异常, 实际 ' + blocks.length); process.exit(1); }
const mainBlock = blocks.find(b => b.includes('btnGen')) || blocks[blocks.length - 1];
try { blocks.forEach((b, i) => new Function(b)); }
catch (e) { console.error('FAIL syntax: ' + e.message); process.exit(1); }
check(true, '全部 script 块语法正确 (' + blocks.length + ' 块)');

/* ---------- 2. 裁判口令逻辑 (vm 沙箱 + DOM 模拟) ---------- */
function makeCtx(search) {
  const els = {};
  const makeEl = id => ({ id, value:'', checked:false, textContent:'', innerHTML:'', className:'', style:{}, scrollHeight:0, scrollTop:0, select(){}, appendChild(){}, querySelector(){return null}, querySelectorAll(){return []}, addEventListener(){}, classList:{add(){},remove(){},toggle(){},contains(){return false}} });
  const ls = { store:{}, setItem(k,v){this.store[k]=String(v)}, getItem(k){return k in this.store?this.store[k]:null}, removeItem(k){delete this.store[k]} };
  const client = { enterRoom: async()=>{}, leaveRoom: async()=>{}, on(){}, startRemoteVideo: async()=>{}, stopRemoteVideo: async()=>{}, muteRemoteAudio(){}, callExperimentalAPI(){}, stopLocalVideo: async()=>{}, stopLocalAudio: async()=>{} };
  const TRTC = { isSupported: ()=>true, EVENT:{}, TYPE:{STREAM_TYPE_MAIN:0, STREAM_TYPE_SUB:1}, create: ()=>client };
  const sandbox = {
    console, URLSearchParams, TextEncoder, setTimeout, setInterval, clearInterval, crypto,
    document: { getElementById: id => els[id] || (els[id]=makeEl(id)), createElement: ()=>makeEl(''), execCommand: ()=>true },
    location: { origin:'http://localhost:8000', pathname:'/index.html', search: search || '' },
    localStorage: ls, window: { TRTC }, TRTC,
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString('binary')
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  return { els, sandbox };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  /* 0. 预取: JUDGE_KEY + genUserSig + 有效测试签名 (供口令/面板测试与算法对拍) */
  const JUDGE_KEY = (mainBlock.match(/var JUDGE_KEY = '([^']+)'/) || [, ''])[1];
  const fnSrc = mainBlock.match(/async function genUserSig[\s\S]*?\n\}/);
  if (!fnSrc) { console.error('FAIL: genUserSig 未找到'); process.exit(1); }
  const genUserSig = eval('(' + fnSrc[0] + ')');
  const TEST_KEY = 'unit-test-key', APP = 1600156752;
  const testSig = await genUserSig(APP, TEST_KEY, 'judge', 86400);

  // 错误口令 → 降级选手 + 警告
  let ctx = makeCtx('?room=race1&userId=judge&userSig=' + encodeURIComponent(testSig) + '&judge=1&judgeKey=wrong');
  vm.runInContext(mainBlock, ctx.sandbox);
  await sleep(200);
  check(!ctx.els.judgePanel && !!ctx.els.playerPanel, '错误口令 → 降级为选手模式');
  check((ctx.els.log.textContent || '').indexOf('裁判口令错误') >= 0, '日志含"裁判口令错误"');

  // 正确口令 → 裁判模式
  ctx = makeCtx('?room=race1&userId=judge&userSig=' + encodeURIComponent(testSig) + '&judge=1&judgeKey=' + JUDGE_KEY);
  vm.runInContext(mainBlock, ctx.sandbox);
  await sleep(200);
  check(!!ctx.els.judgePanel && !ctx.els.playerPanel, '正确口令 → 裁判模式');

  // 组织者工具: 裁判链接带 judgeKey, 选手链接不带
  ctx = makeCtx('');
  vm.runInContext(mainBlock, ctx.sandbox);
  ['inpRoom','inpKey','inpUsers','selExpire','outLinks','inpJudgeKeyTool'].forEach(id => ctx.sandbox.document.getElementById(id));
  ctx.els.inpRoom.value = 'race1';
  ctx.els.inpKey.value = 'K';
  ctx.els.inpUsers.value = 'judge\nplayer1';
  ctx.els.inpJudgeKeyTool.value = 'mysecret';
  ctx.els.selExpire.value = '86400';
  await ctx.els.btnGen.onclick();
  const lines = ctx.els.outLinks.value.split('\n').filter(Boolean);
  check(lines.length === 2, '工具生成 2 条链接');
  check(lines[0].indexOf('judge=1') >= 0 && lines[0].indexOf('judgeKey=mysecret') >= 0, '裁判链接含 judgeKey');
  check(lines[1].indexOf('auto=1') >= 0 && lines[1].indexOf('judgeKey') < 0, '选手链接不含 judgeKey');

  /* ---------- 3. genUserSig 与参考算法一致性 (固定测试密钥, 复用上面提取的函数) ---------- */
  const sig = await genUserSig(APP, TEST_KEY, 'player1', 86400);
  const p = JSON.parse(Buffer.from(sig, 'base64').toString('utf8'));
  const input = 'TLS.identifier:player1\nTLS.sdkappid:' + APP + '\nTLS.time:' + p['TLS.time'] + '\nTLS.expire:' + p['TLS.expire'] + '\n';
  const expect = crypto.createHmac('sha256', TEST_KEY).update(input).digest('base64');
  check(p['TLS.sig'] === expect && p['TLS.sdkappid'] === APP && p['TLS.ver'] === '2.0', 'genUserSig 与 HMAC-SHA256 参考算法一致');

  console.log('==> ' + (fail === 0 ? '全部通过 ✅ (' + pass + ')' : '存在失败 ❌ (' + fail + ')'));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FAIL: ' + e.stack); process.exit(1); });
