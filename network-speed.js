/*
 * 网络测速 for Quantumult X (OVH稳定版)
 * 测试地址：http://proof.ovh.net/files/10Mb.dat
 * 超时30秒，带缓存兜底
 */

const $ = new Env('network-speed')
let arg
if (typeof $argument !== 'undefined') {
  arg = Object.fromEntries($argument.split('&').map(item => item.split('=')))
}

const CACHE_KEY = 'netspeed_ovh'
;(async () => {
  const mb = Number(arg?.mb) || 10
  // OVH 提供固定大小文件：1Mb.dat, 10Mb.dat, 100Mb.dat, 1000Mb.dat
  const file = mb <= 1 ? '1Mb.dat' : mb <= 10 ? '10Mb.dat' : '100Mb.dat'
  const url = `http://proof.ovh.net/files/${file}`
  
  let down = { url, timeout: 30000 }
  down = ReRequest(down, $environment?.params)

  let speed, duration, isCached = false, cache
  try { cache = JSON.parse($prefs.valueForKey(CACHE_KEY) || 'null') } catch (e) {}

  try {
    const start = Date.now()
    await $.http.get(down)
    duration = (Date.now() - start) / 1000
    // 实际下载量可能小于 mb，用实际用时计算
    speed = (mb * 8) / duration  // 这里直接用 mb 估算（OVH 文件大小固定）
    $prefs.setValueForKey(JSON.stringify({ speed, duration, timestamp: Date.now() }), CACHE_KEY)
  } catch (e) {
    if (cache) {
      speed = cache.speed
      duration = cache.duration
      isCached = true
    } else {
      $.done({
        title: '网络测速失败',
        content: '无法连接到测速服务器\n请切换节点后重试',
        icon: 'wifi.slash',
        'icon-color': '#FF3B30'
      })
      return
    }
  }

  const speedMbps = round(speed, 1)
  const Panel = {
    title: arg?.title || '网速测试',
    content:
      `⬇️ 速率：${speedMbps} Mbps\n` +
      `📦 文件：${file}\n` +
      `⏱ 用时：${round(duration, 2)}s\n` +
      `🕒 时间：${new Date().toTimeString().split(' ')[0]}\n` +
      `🚀 节点：${$environment?.params || '无'}` +
      (isCached ? '\n⚠️ 使用缓存数据' : ''),
    icon: 'network',
    'icon-color': '#007AFF'
  }
  $.done(Panel)
})()
.catch(e => {
  $.done({
    title: '测速异常',
    content: '脚本运行出错，请查看日志',
    icon: 'exclamationmark.triangle',
    'icon-color': '#FF9500'
  })
})

// ========== 工具 ==========
function round(num, precision = 0) {
  const factor = Math.pow(10, precision)
  return Math.round(num * factor) / factor
}
function ReRequest(req = {}, proxy) {
  if (proxy) req.opts = { policy: proxy }
  return req
}

function Env(t, s) {
  return new class {
    constructor(t, s) { this.name = t; Object.assign(this, s) }
    isQuanX() { return typeof $task !== 'undefined' }
    get(t, cb = () => {}) {
      if (t.headers) { delete t.headers['Content-Type']; delete t.headers['Content-Length'] }
      $task.fetch(t).then(res => {
        cb(null, { status: res.statusCode, headers: res.headers, body: res.body }, res.body)
      }, err => cb(err?.error || 'UndefinedError'))
    }
    done(t = {}) { $done(t) }
  }(t, s)
}
