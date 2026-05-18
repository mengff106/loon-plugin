const $ = new Env('test')
$.done({
  title: '环境正常',
  content: '如果你看到这行，说明脚本与面板渲染都没问题\n时间：' + new Date().toTimeString().split(' ')[0],
  icon: 'network',
  'icon-color': '#34C759'
})

function Env(t,s){return new class{constructor(t,s){this.name=t}done(t={}){$done(t)}}(t,s)}
