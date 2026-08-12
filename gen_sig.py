#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TRTC UserSig 生成器 (TLS-SIG v2.0, 纯标准库, 无需装任何依赖)

用法:
  # 单个生成
  python gen_sig.py --sdkappid 1600156752 --key 你的密钥 --user player1 --expire 15552000

  # 批量生成 (users.txt 每行一个 userId)
  python gen_sig.py --sdkappid 1600156752 --key 你的密钥 --batch users.txt

输出: 每行 "userId<TAB>UserSig", 可直接复制进页面或拼链接。
expire 单位为秒, 默认 15552000 = 180 天。

安全提醒: 密钥(SecretKey)不要发给任何人、不要写进页面代码; 页面链接里只放生成的 UserSig。
"""
import argparse
import base64
import hashlib
import hmac
import json
import sys
import time


def gen_user_sig(sdkappid: int, key: str, userid: str, expire: int = 15552000) -> str:
    """腾讯云 TRTC UserSig (TLS-SIG v2.0)"""
    now = int(time.time())
    input_str = f"TLS.identifier:{userid}&TLS.sdkappid:{sdkappid}&TLS.time:{now}&TLS.expire:{expire}"
    sig = hmac.new(key.encode("utf-8"), input_str.encode("utf-8"), hashlib.sha256).digest()
    payload = {
        "TLS.ver": "2.0",
        "TLS.identifier": userid,
        "TLS.sdkappid": sdkappid,
        "TLS.expire": expire,
        "TLS.time": now,
        "TLS.sig": base64.b64encode(sig).decode("utf-8"),
    }
    json_str = json.dumps(payload, separators=(",", ":"))
    return base64.b64encode(json_str.encode("utf-8")).decode("utf-8")


def main():
    ap = argparse.ArgumentParser(description="TRTC UserSig 生成器")
    ap.add_argument("--sdkappid", type=int, required=True, help="TRTC 应用 SDKAppID")
    ap.add_argument("--key", required=True, help="应用密钥 SecretKey (勿外泄)")
    ap.add_argument("--user", help="单个 userId")
    ap.add_argument("--batch", help="批量文件, 每行一个 userId")
    ap.add_argument("--expire", type=int, default=15552000, help="有效期秒, 默认 180 天")
    args = ap.parse_args()

    users = []
    if args.user:
        users.append(args.user)
    if args.batch:
        with open(args.batch, encoding="utf-8") as f:
            users += [line.strip() for line in f if line.strip()]
    if not users:
        print("请提供 --user 或 --batch"); sys.exit(1)

    for uid in users:
        sig = gen_user_sig(args.sdkappid, args.key, uid, args.expire)
        print(f"{uid}\t{sig}")


if __name__ == "__main__":
    main()
