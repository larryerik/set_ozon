import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table'

export default function Home() {
  const [items, setItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('orders') || '[]')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })
  const settings = useMemo(() => JSON.parse(localStorage.getItem('settings') || '{}'), [])
  const [syncLoading, setSyncLoading] = useState(false)

  function normalizeOrders(raw) {
    if (!Array.isArray(raw)) return items
    return raw.map((o) => {
      const order_id = o.order_id ?? o.orderId ?? ''
      const order_number = o.order_number ?? o.orderNumber ?? ''
      const state = o.state ?? ''
      const supplies = Array.isArray(o.supplies)
        ? o.supplies.map((s) => ({
            ...s,
            items: Array.isArray(s.items)
              ? s.items.map((it) => ({
                  ...it,
                  icon_path:
                    typeof it.icon_path === 'string'
                      ? it.icon_path.replace(/`/g, '').trim()
                      : it.icon_path,
                }))
              : [],
          }))
        : []
      return { order_id, order_number, state, supplies }
    })
  }

  function stateLabel(s) {
    if (s === 'READY_TO_SUPPLY') return '准备发货'
    if (s === 'DATA_FILLING') return '数据填充'
    return s
  }

  async function onSync() {
    // 示例：读取设置并尝试请求后端。如果未配置则仅模拟更新状态。
    if (!settings.clientId || !settings.apiKey) {
      return
    }
    setSyncLoading(true)
    try {
      const res = await fetch(`/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: settings.clientId, api_key: settings.apiKey }),
      })
      if (res.ok) {
        const data = await res.json()
        const next = Array.isArray(data)
          ? normalizeOrders(data)
          : Array.isArray(data?.orders)
          ? normalizeOrders(data.orders)
          : Array.isArray(data?.items)
          ? normalizeOrders(data.items)
          : items
        setItems(next)
        localStorage.setItem('orders', JSON.stringify(next))
      } else {
        console.error('sync failed', res.status)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSyncLoading(false)
    }
  }

  const navigate = useNavigate()

  function onAction(action, idx) {
    if (action === '删除') {
      setItems(prev => prev.filter((_, i) => i !== idx))
    } else if (action === '编辑') {
      navigate(`/edit/${items[idx].order_id}`)
    }
  }

  useEffect(() => {
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {syncLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card text-card-foreground border border-border rounded-md px-6 py-4">同步中...</div>
        </div>
      )}
      <div className="flex items-center justify-end">
        <Button onClick={onSync} disabled={syncLoading}>同步</Button>
      </div>
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>供货编号</TableHead>
              <TableHead>order_id</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="w-40">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it, idx) => (
              <TableRow key={`${it.order_number}-${it.order_id}`}>
                <TableCell>{it.order_number}</TableCell>
                <TableCell>{it.order_id}</TableCell>
                <TableCell>{stateLabel(it.state)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onAction('编辑', idx)}>编辑</Button>
                    <Button variant="destructive" size="sm" onClick={() => onAction('删除', idx)}>删除</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}