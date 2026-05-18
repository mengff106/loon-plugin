/*
 * 网络测速 for Quantumult X
 * 原作者：@wuhu_zzz @xream @keywos @整点猫咪
 * 适配：仅保留 QX 逻辑，面板输出修正
 *
 * 参数（$argument，用 & 连接 key=value）：
 * title      : 标题，默认“网速测试”
 * iconfast   : 高速图标 (≥100 Mbps)
 * iconmid    : 中速图标 (50-100 Mbps)
 * iconslow   : 低速图标 (<50 Mbps)
 * colorlow   : 低延迟颜色 (<100ms)，如 #06D6A0
 * colormid   : 中延迟颜色 (100-200ms)，如 #FFD166
 * colorhigh  : 高延迟颜色 (≥200ms)，如 #EF476F
 * mb         : 测试数据量 MB，默认10 (受CF限制实际最大约4)
 *
 * 示例参数：
 * title=极速测试&iconfast=bolt.fill&iconmid=flame&iconslow=tortoise&colorlow=#06D6A0&colormid=#FFD166&colorhigh=#EF476F&mb=4
 */

const $ = new Env('network-speed')
let arg
if (typeof $argument !== 'undefined') {
  arg = Object.fromEntries($argument.split('&').map(item => item.split('=')))
}

;(async () => {
  const mb = Number(arg?.mb) || 10
  const bytes = mb * 1024 * 1024

  let down = { url: `https://speed.cloudflare.com/__down?bytes=${bytes}`, timeout: 3000 }
  let cp   = { url: `https://speed.cloudflare.com/__up?bytes=${bytes}`, timeout: 3000 }

  // 指定代理策略（使用当前环境节点）
  down = ReRequest(down, $environment?.params)
  cp   = ReRequest(cp, $environment?.params)

  console.log('down:' + JSON.stringify(down))

  // 下行速率测试
  const Down_start = Date.now()
  await $.http.get(down)
  const Down_end = Date.now()
  const duration = (Down_end - Down_start) / 1000
  const speed = mb / duration

  // 延迟测试
  const Ping_start = Date.now()
  await $.http.get(cp)
  const pingt = Date.now() - Ping_start

  const a = Diydecide(0, 50, 100, round(Math.abs(speed * 8)))      // 0,1,2
  const b = Diydecide(0, 100, 200, pingt) + 3                     // 3,4,5

  const shifts = {
    '1': arg?.iconslow,
    '2': arg?.iconmid,
    '3': arg?.iconfast,
    '4': arg?.colorlow,
    '5': arg?.colormid,
    '6': arg?.colorhigh
  }

  const icon = shifts[a] || 'hare'
  const color = shifts[b] || '#CDCDCD'

  // 构造 QX 面板（注意：字段是 content 不是 message）
  const Panel = {
    title: arg?.title || '网速测试',
    content:
      `下行速率：${round(Math.abs(speed * 8))} Mbps [${round(Math.abs(speed), 1)} MB/s]\n` +
      `网络延迟：${pingt} ms\n` +
      `测试用时：${round(duration, 2)} s\n` +
      `测试时间：${new Date().toTimeString().split(' ')[0]}\n` +
      `节点 ➟ ${$environment?.params || '无'}`,
    icon: icon,
    'icon-color': color
  }

  $.done(Panel)
})()
.catch(e => $.logErr(e))
.finally(() => $.done())

// ========== 工具函数 ==========
function createRound(methodName) {
  const func = Math[methodName]
  return (number, precision) => {
    precision = precision == null ? 0 : precision >= 0 ? Math.min(precision, 292) : Math.max(precision, -292)
    if (precision) {
      let pair = `${number}e`.split('e')
      const value = func(`${pair[0]}e${+pair[1] + precision}`)
      pair = `${value}e`.split('e')
      return +`${pair[0]}e${+pair[1] - precision}`
    }
    return func(number)
  }
}

function round(...args) {
  return createRound('round')(...args)
}

function Diydecide(x, y, z, item) {
  const array = [x, y, z]
  array.push(item)
  return array.sort((a, b) => a - b).findIndex(i => i === item)
}

function ReRequest(request = {}, proxyName = '') {
  if (proxyName) {
    if (request.opts) request.opts.policy = proxyName
    else request.opts = { policy: proxyName }
  }
  return request
}

// ========== 最小化 Env 兼容层（仅 QX） ==========
function Env(t, s) {
  class e {
    constructor(t) { this.env = t }
    send(t, s = 'GET') {
      t = typeof t === 'string' ? { url: t } : t
      let e = this.get
      if (s === 'POST') e = this.post
      return new Promise((resolve, reject) => {
        e.call(this, t, (err, res, body) => {
          err ? reject(err) : resolve(res)
        })
      })
    }
    get(t) { return this.send.call(this.env, t) }
    post(t) { return this.send.call(this.env, t, 'POST') }
  }

  return new class {
    constructor(t, s) {
      this.name = t
      this.http = new e(this)
      this.data = null
      this.dataFile = 'box.dat'
      this.logs = []
      this.isMute = false
      this.isNeedRewrite = false
      this.encoding = 'utf-8'
      this.startTime = Date.now()
      Object.assign(this, s)
    }

    isQuanX() { return typeof $task !== 'undefined' }
    lodash_get(t, s, e) {
      const i = s.replace(/\[(\d+)\]/g, '.$1').split('.')
      let r = t
      for (const t of i) if (r = Object(r)[t], r === undefined) return e
      return r
    }
    get(t, s = () => {}) {
      if (t.headers) {
        delete t.headers['Content-Type']
        delete t.headers['Content-Length']
      }
      if (this.isQuanX()) {
        this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: false }))
        $task.fetch(t).then(
          res => {
            const { statusCode: status, headers, body } = res
            s(null, { status, headers, body }, body)
          },
          err => s(err?.error || 'UndefinedError')
        )
      }
    }
    post(t, s = () => {}) {
      const method = t.method ? t.method.toLowerCase() : 'post'
      if (t.body && t.headers && !t.headers['Content-Type']) {
        t.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      }
      delete t.headers?.['Content-Length']
      if (this.isQu
