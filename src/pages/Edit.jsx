// /Users/chenfeng/Documents/set_ozon/src/pages/Edit.jsx
import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export default function Edit() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const order = useMemo(() => {
    try {
      const arr = JSON.parse(localStorage.getItem('orders') || '[]')
      return arr.find(o => String(o.order_id) === String(orderId)) || { supplies: [] }
    } catch {
      return { supplies: [] }
    }
  }, [orderId])

  const supplies = Array.isArray(order.supplies) ? order.supplies : []

  const [assembleOpen, setAssembleOpen] = useState(false)
  const [currentSupply, setCurrentSupply] = useState(null)
  const [boxConfig, setBoxConfig] = useState({})
  const [boxAlloc, setBoxAlloc] = useState({})
  const [palletRows, setPalletRows] = useState([])
  const [execLoading, setExecLoading] = useState(false)

  function single(offer) {
    const v = Number(boxConfig[offer]?.single || 1)
    return v > 0 ? v : 1
  }
  function setSingle(offer, val) {
    setBoxConfig(prev => ({ ...prev, [offer]: { ...(prev[offer]||{}), single: Number(val)||1 } }))
  }
  function setBarcode(offer, val) {
    setBoxConfig(prev => ({ ...prev, [offer]: { ...(prev[offer]||{}), barcode: val } }))
  }
  function setBoxCount(offer, val) {
    const n = Math.max(0, Number(val)||0)
    setBoxAlloc(prev => ({ ...prev, [offer]: n }))
  }
  function totalBoxes() {
    return Object.values(boxAlloc).reduce((a,b)=>a+(Number(b)||0),0)
  }
  function palletsByOffer(offer) {
    return palletRows.filter(r=>r.offer_id===offer).reduce((a,b)=>a+(Number(b.boxes)||0),0)
  }
  function productQuantity(offer) {
    const p = (currentSupply?.items||[]).find(i=>i.offer_id===offer)
    return Number(p?.quantity||0)
  }
  function offerUsedQty(offer) {
    return (Number(boxAlloc[offer]||0)+palletsByOffer(offer))*single(offer)
  }
  function addPalletRow() {
    const first = (currentSupply?.items||[])[0]
    setPalletRows(prev => [...prev, { offer_id: first?.offer_id||'', boxes: 0 }])
  }
  function updatePalletRow(idx, patch) {
    setPalletRows(prev => prev.map((r,i)=> i===idx ? { ...r, ...patch } : r))
  }
  function removePalletRow(idx) {
    setPalletRows(prev => prev.filter((_,i)=>i!==idx))
  }
  function onSaveAssemble() {
    const orders = JSON.parse(localStorage.getItem('orders')||'[]')
    const oi = orders.findIndex(o=>String(o.order_id)===String(orderId))
    if (oi>=0) {
      const si = (orders[oi].supplies||[]).findIndex(s=>String(s.supply_id)===String(currentSupply.supply_id))
      if (si>=0) {
        orders[oi].supplies[si].assemble = { boxConfig, boxAlloc, palletRows }
        localStorage.setItem('orders', JSON.stringify(orders))
      }
    }
    setAssembleOpen(false)
  }

  function onEditAssemble(supply) {
    setCurrentSupply(supply)
    let saved = {}
    try {
      const orders = JSON.parse(localStorage.getItem('orders')||'[]')
      const oi = orders.findIndex(o=>String(o.order_id)===String(orderId))
      if (oi>=0) {
        const si = (orders[oi].supplies||[]).findIndex(s=>String(s.supply_id)===String(supply.supply_id))
        if (si>=0) saved = orders[oi].supplies[si].assemble || {}
      }
    } catch {}
    setBoxConfig(saved.boxConfig || {})
    setBoxAlloc(saved.boxAlloc || {})
    setPalletRows(Array.isArray(saved.palletRows) ? saved.palletRows : [])
    setAssembleOpen(true)
  }

  function onExecute(supply) {
    try {
      let settings = {}
      try { settings = JSON.parse(localStorage.getItem('settings')||'{}') } catch { settings = {} }
      const client_id = settings.clientId || ''
      const api_key = settings.apiKey || ''
      if (!client_id || !api_key) { alert('缺少client_id或api_key'); return }
      const idx = supplies.findIndex(s=>String(s.supply_id)===String(supply.supply_id))
      const supplyIndex = idx>=0 ? (idx+1) : 1

      let saved = {}
      try {
        const orders = JSON.parse(localStorage.getItem('orders')||'[]')
        const oi = orders.findIndex(o=>String(o.order_id)===String(orderId))
        if (oi>=0) {
          const si = (orders[oi].supplies||[]).findIndex(s=>String(s.supply_id)===String(supply.supply_id))
          if (si>=0) saved = orders[oi].supplies[si].assemble || {}
        }
      } catch {}

      const usedBoxConfig = Object.keys(saved.boxConfig||{}).length ? saved.boxConfig : boxConfig
      const usedBoxAlloc = Object.keys(saved.boxAlloc||{}).length ? saved.boxAlloc : boxAlloc
      const usedPalletRows = Array.isArray(saved.palletRows) && saved.palletRows.length ? saved.palletRows : palletRows
      const items = Array.isArray(supply.items) ? supply.items : []

      const productQtyMap = items.reduce((m,it)=>{ m[it.offer_id] = Number(it.quantity||0); return m },{})
      function resolveSingle(offer){
        const s = Number(usedBoxConfig[offer]?.single||0)
        if (s>0) return s
        const boxCount = Math.max(0, Number(usedBoxAlloc[offer]||0))
        if (boxCount>0) {
          const total = Number(productQtyMap[offer]||0)
          const per = Math.floor(total/boxCount)
          return per>0 ? per : 1
        }
        const sumBoxes = usedPalletRows.filter(r=>r.offer_id===offer).reduce((a,b)=>a+Math.max(0, Number(b.boxes||0)),0)
        if (sumBoxes>0) {
          const total = Number(productQtyMap[offer]||0)
          const per = Math.floor(total/sumBoxes)
          return per>0 ? per : 1
        }
        return 1
      }

      const missingBarcode = items.some(it => {
        const b = Math.max(0, Number(usedBoxAlloc[it.offer_id]||0))
        const p = usedPalletRows.some(r=> r.offer_id===it.offer_id && Number(r.boxes||0)>0)
        return (b>0 || p) && !usedBoxConfig[it.offer_id]?.barcode
      })
      if (missingBarcode) { alert('请填写所有已分配项的箱条码'); return }

      const pack = []
      items.forEach(it => {
        const count = Math.max(0, Number(usedBoxAlloc[it.offer_id]||0))
        const barcode = usedBoxConfig[it.offer_id]?.barcode || ''
        const s = resolveSingle(it.offer_id)
        for (let i=0; i<count; i++) {
          pack.push({
            key: `BOX_${supplyIndex}-${barcode}_${i}`,
            value: { items: [{ offer_id: it.offer_id, quant: 1, quantity: s }], type: 'BOX' }
          })
        }
      })
      usedPalletRows.forEach((r, idx2) => {
        const boxes = Math.max(0, Number(r.boxes||0))
        if (boxes>0) {
          const barcode = usedBoxConfig[r.offer_id]?.barcode || ''
          const s = resolveSingle(r.offer_id)
          pack.push({
            key: `PALLET_${supplyIndex}-${barcode}_${idx2}`,
            value: { items: [{ offer_id: r.offer_id, quant: 1, quantity: boxes*s }], type: 'PALLET' }
          })
        }
      })
      const body = { client_id, api_key, cargoes_pack: pack, supply_id: String(supply.supply_id) }
      setExecLoading(true)
      fetch('/api/create-cargoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(async res => {
          const text = await res.text()
          if (!res.ok) throw new Error(text||`HTTP ${res.status}`)
          alert('已发送')
        })
        .catch(err => {
          alert(`发送失败: ${String(err.message||err)}`)
        })
        .finally(() => setExecLoading(false))
    } catch (e) {
      alert('数据准备失败')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {execLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card text-card-foreground border border-border rounded-md px-6 py-4">执行中...</div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="font-semibold">编辑订单 - {orderId}</div>
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>返回</Button>
      </div>
      {assembleOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-4xl bg-card text-card-foreground rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">编辑装配 - {currentSupply?.supply_id}</div>
              <Button variant="outline" size="sm" onClick={() => setAssembleOpen(false)}>关闭</Button>
            </div>

            <div className="space-y-2">
              <div className="font-medium">产品列表</div>
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-2/12">货号</TableHead>
                    <TableHead className="w-2/12">数量</TableHead>
                    <TableHead className="w-3/12">单箱数量</TableHead>
                    <TableHead className="w-3/12">箱数</TableHead>
                    <TableHead className="w-2/12">箱条码</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(currentSupply?.items||[]).map((it) => (
                    <TableRow key={String(it.offer_id)}>
                      <TableCell className="truncate"><span className="block truncate">{it.offer_id}</span></TableCell>
                      <TableCell>{it.quantity}</TableCell>
                      <TableCell>
                        <Input type="number" min="1" value={boxConfig[it.offer_id]?.single||''} onChange={(e)=>setSingle(it.offer_id, e.target.value)} />
                      </TableCell>
                      <TableCell>{Math.floor(Number(it.quantity||0)/single(it.offer_id))}</TableCell>
                      <TableCell>
                        <Input className={offerUsedQty(it.offer_id)>0 && !boxConfig[it.offer_id]?.barcode ? 'border-destructive' : ''} value={boxConfig[it.offer_id]?.barcode||''} onChange={(e)=>setBarcode(it.offer_id, e.target.value)} />
                        {offerUsedQty(it.offer_id)>0 && !boxConfig[it.offer_id]?.barcode ? <div className="text-destructive text-xs mt-1">必填</div> : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <div className="font-medium">箱分配</div>
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-4/12">货号</TableHead>
                    <TableHead className="w-4/12">分配箱数</TableHead>
                    <TableHead className="w-4/12">数量</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(currentSupply?.items||[]).map((it) => {
                    const b = Number(boxAlloc[it.offer_id]||0)
                    const qty = b*single(it.offer_id)
                    const exceed = qty > Number(it.quantity||0)
                    return (
                      <TableRow key={`box-${String(it.offer_id)}`} className={exceed? 'text-destructive' : ''}>
                        <TableCell className="truncate"><span className="block truncate">{it.offer_id}</span></TableCell>
                        <TableCell>
                          <Input type="number" min="0" value={boxAlloc[it.offer_id]||''} onChange={(e)=>setBoxCount(it.offer_id, e.target.value)} />
                        </TableCell>
                        <TableCell>{qty}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {totalBoxes() > 30 && <div className="text-destructive">总箱数不可超过30</div>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">托盘列表</div>
                <Button variant="outline" size="sm" onClick={addPalletRow}>添加托盘</Button>
              </div>
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/12">托盘</TableHead>
                    <TableHead className="w-4/12">货号</TableHead>
                    <TableHead className="w-3/12">分配箱数</TableHead>
                    <TableHead className="w-2/12">数量</TableHead>
                    <TableHead className="w-1/12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {palletRows.map((r, idx) => {
                    const s = single(r.offer_id)
                    const qty = Number(r.boxes||0)*s
                    const max = productQuantity(r.offer_id)
                    const exceed = offerUsedQty(r.offer_id) > max
                    return (
                      <TableRow key={`pal-${idx}`} className={exceed? 'text-destructive' : ''}>
                        <TableCell className="text-center">{idx + 1}</TableCell>
                        <TableCell>
                          <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={r.offer_id} onChange={(e)=>updatePalletRow(idx,{offer_id:e.target.value})}>
                            {(currentSupply?.items||[]).map(it=> (
                              <option key={`opt-${it.offer_id}`} value={it.offer_id}>{it.offer_id}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="0" value={r.boxes} onChange={(e)=>updatePalletRow(idx,{boxes: Math.max(0, Number(e.target.value)||0)})} />
                        </TableCell>
                        <TableCell>{qty}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={()=>removePalletRow(idx)}>移除</Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setAssembleOpen(false)}>取消</Button>
              <Button onClick={onSaveAssemble} disabled={ totalBoxes()>30 || (currentSupply?.items||[]).some(it=> offerUsedQty(it.offer_id) > productQuantity(it.offer_id)) || (currentSupply?.items||[]).some(it=> offerUsedQty(it.offer_id)>0 && !boxConfig[it.offer_id]?.barcode) }>保存</Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border border-border overflow-hidden">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">供货ID</TableHead>
              <TableHead className="w-1/4 text-center">编辑装配</TableHead>
              <TableHead className="w-1/4 text-center">执行</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplies.map((s) => (
              <TableRow key={String(s.supply_id)}>
                <TableCell className="truncate"><span className="block truncate">{s.supply_id}</span></TableCell>
                <TableCell className="text-center">
                  <Button className="w-full" variant="outline" size="sm" onClick={() => onEditAssemble(s)}>编辑装配</Button>
                </TableCell>
                <TableCell className="text-center">
                  <Button className="w-full" size="sm" onClick={() => onExecute(s)}>执行</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}