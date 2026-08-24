const http = require('node:http')
const fs = require('node:fs')
const { URL } = require('node:url')

const PORT = 8080
const FILE = 'chat.txt'

function pad(n) {
    return n < 10 ? '0' + n : '' + n
}

function now() {
    const d = new Date()
    return (
        d.getFullYear() +
        '-' +
        pad(d.getMonth() + 1) +
        '-' +
        pad(d.getDate()) +
        ' ' +
        pad(d.getHours()) +
        ':' +
        pad(d.getMinutes()) +
        ':' +
        pad(d.getSeconds())
    )
}

// 把消息里的 & < > 换成转义，免得一条 <h1> 把页面搞坏
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

// 每一行：2026-08-24 12:00:00 user: 消息
// 行首如果加了 * 表示置顶
function parseLine(line) {
    let pinned = false
    if (line.startsWith('* ')) {
        pinned = true
        line = line.slice(2)
    }
    const time = line.slice(0, 19)
    const rest = line.slice(20)
    const idx = rest.indexOf(': ')
    const user = idx === -1 ? rest : rest.slice(0, idx)
    const msg = idx === -1 ? '' : rest.slice(idx + 2)
    return { pinned, time, user, msg }
}

function readChat() {
    if (!fs.existsSync(FILE)) return []
    const text = fs.readFileSync(FILE, 'utf8')
    return text
        .split('\n')
        .map(l => l.replace(/\r$/, ''))
        .filter(l => l.trim() !== '')
}

function renderPage() {
    const items = readChat().map(parseLine)
    const pinned = items.filter(i => i.pinned)
    const normal = items.filter(i => !i.pinned)
    const all = pinned.concat(normal)

    let html =
        '<html><head><meta charset="utf-8"><title>txtchat</title></head><body>'
    html += '<h1>txtchat</h1>'
    for (const i of all) {
        html +=
            '<p>' + escapeHtml(i.time + ' ' + i.user + ': ' + i.msg) + '</p>'
    }
    html += '</body></html>'
    return html
}

http.createServer((req, res) => {
    // 只用 GET。其它都 405。
    if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('405 Method Not Allowed')
        return
    }

    const url = new URL(req.url || '/', 'http://localhost:' + PORT)

    if (url.pathname === '/send') {
        const msg = url.searchParams.get('msg') || ''
        const user = url.searchParams.get('user') || '匿名'
        if (msg === '') {
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
            res.end('你什么都没喊')
            return
        }
        const line = now() + ' ' + user + ': ' + msg
        fs.appendFileSync(FILE, line + '\n')
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end(line)
        return
    }

    // 其它路径都算看消息
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(renderPage())
}).listen(PORT, () => {
    console.log('txtchat 跑起来了：http://localhost:' + PORT)
})
