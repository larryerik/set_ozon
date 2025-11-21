// /Users/chenfeng/Documents/set_ozon/src/pages/Edit.jsx
import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { DatePicker } from '../components/ui/date-picker'
import { ChevronLeft } from 'lucide-react'

export default function Edit() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(() => {
    try {
      const arr = JSON.parse(localStorage.getItem('orders') || '[]')
      return arr.find(o => String(o.order_id) === String(orderId)) || { supplies: [] }
    } catch {
      return { supplies: [] }
    }
  })
  const [supplies, setSupplies] = useState(Array.isArray(order.supplies) ? order.supplies : [])

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
    setBoxConfig(prev => ({ ...prev, [offer]: { ...(prev[offer] || {}), single: Number(val) || 1 } }))
  }
  function setBarcode(offer, val) {
    setBoxConfig(prev => ({ ...prev, [offer]: { ...(prev[offer] || {}), barcode: val } }))
  }
  function setExpiresAt(offer, val) {
    setBoxConfig(prev => ({ ...prev, [offer]: { ...(prev[offer] || {}), expires_at: val } }))
  }
  function setBoxCount(offer, val) {
    const n = Math.max(0, Number(val) || 0)
    setBoxAlloc(prev => ({ ...prev, [offer]: n }))
  }
  function totalBoxes() {
    return Object.values(boxAlloc).reduce((a, b) => a + (Number(b) || 0), 0)
  }
  function palletsByOffer(offer) {
    return palletRows.filter(r => r.offer_id === offer).reduce((a, b) => a + (Number(b.boxes) || 0), 0)
  }
  function productQuantity(offer) {
    const p = (currentSupply?.items || []).find(i => i.offer_id === offer)
    return Number(p?.quantity || 0)
  }
  function offerUsedQty(offer) {
    return (Number(boxAlloc[offer] || 0) + palletsByOffer(offer)) * single(offer)
  }
  function addPalletRow() {
    const first = (currentSupply?.items || [])[0]
    setPalletRows(prev => [...prev, { offer_id: first?.offer_id || '', boxes: 0 }])
  }
  function updatePalletRow(idx, patch) {
    setPalletRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }
  function removePalletRow(idx) {
    setPalletRows(prev => prev.filter((_, i) => i !== idx))
  }
  function onSaveAssemble() {
    try {
      // Validation
      if (totalBoxes() > 30) {
        alert('总箱数不可超过30')
        return
      }
      const items = currentSupply?.items || []
      const overAllocated = items.find(it => offerUsedQty(it.offer_id) > productQuantity(it.offer_id))
      if (overAllocated) {
        alert(`货号 ${overAllocated.offer_id} 分配数量超过总数`)
        return
      }
      const missingBarcode = items.find(it => offerUsedQty(it.offer_id) > 0 && !boxConfig[it.offer_id]?.barcode)
      if (missingBarcode) {
        alert(`货号 ${missingBarcode.offer_id} 已分配但未填写箱条码`)
        return
      }

      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      const oi = orders.findIndex(o => String(o.order_id) === String(orderId))
      if (oi >= 0) {
        const si = (orders[oi].supplies || []).findIndex(s => String(s.supply_id) === String(currentSupply.supply_id))
        if (si >= 0) {
          orders[oi].supplies[si].assemble = { boxConfig, boxAlloc, palletRows }
          localStorage.setItem('orders', JSON.stringify(orders))

          // Update local state to reflect changes immediately
          setOrder(orders[oi])
          setSupplies(orders[oi].supplies || [])
        }
      }

      // Save to global product configs
      try {
        const globalConfigs = JSON.parse(localStorage.getItem('product_configs') || '{}')
        Object.keys(boxConfig).forEach(offerId => {
          const conf = boxConfig[offerId]
          if (conf) {
            globalConfigs[offerId] = {
              ...(globalConfigs[offerId] || {}),
              ...conf
            }
          }
        })
        localStorage.setItem('product_configs', JSON.stringify(globalConfigs))
      } catch (e) {
        console.error('Failed to save global product configs', e)
      }

      setAssembleOpen(false)
    } catch (err) {
      console.error(err)
      alert(`保存出错: ${err.message}`)
    }
  }

  function onEditAssemble(supply) {
    setCurrentSupply(supply)
    let saved = {}
    try {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      const oi = orders.findIndex(o => String(o.order_id) === String(orderId))
      if (oi >= 0) {
        const si = (orders[oi].supplies || []).findIndex(s => String(s.supply_id) === String(supply.supply_id))
        if (si >= 0) saved = orders[oi].supplies[si].assemble || {}
      }
    } catch { }

    const initialBoxConfig = { ...(saved.boxConfig || {}) }

    // Load global configs and apply defaults
    try {
      const globalConfigs = JSON.parse(localStorage.getItem('product_configs') || '{}')
      if (supply && Array.isArray(supply.items)) {
        supply.items.forEach(it => {
          const oid = it.offer_id
          const g = globalConfigs[oid]
          if (g) {
            if (!initialBoxConfig[oid]) {
              initialBoxConfig[oid] = { ...g }
            } else {
              if (!initialBoxConfig[oid].single && g.single) initialBoxConfig[oid].single = g.single
              if (!initialBoxConfig[oid].barcode && g.barcode) initialBoxConfig[oid].barcode = g.barcode
              if (!initialBoxConfig[oid].expires_at && g.expires_at) initialBoxConfig[oid].expires_at = g.expires_at
            }
          }
        })
      }
    } catch (e) {
      console.error('Failed to load global product configs', e)
    }

    setBoxConfig(initialBoxConfig)
    setBoxAlloc(saved.boxAlloc || {})
    setPalletRows(Array.isArray(saved.palletRows) ? saved.palletRows : [])
    setAssembleOpen(true)
  }

  function generatePack(supply, saved, supplyIndex) {
    const usedBoxConfig = Object.keys(saved.boxConfig || {}).length ? saved.boxConfig : {}
    const usedBoxAlloc = Object.keys(saved.boxAlloc || {}).length ? saved.boxAlloc : {}
    const usedPalletRows = Array.isArray(saved.palletRows) && saved.palletRows.length ? saved.palletRows : []
    const items = Array.isArray(supply.items) ? supply.items : []

    const productQtyMap = items.reduce((m, it) => { m[it.offer_id] = Number(it.quantity || 0); return m }, {})

    function resolveSingle(offer) {
      const s = Number(usedBoxConfig[offer]?.single || 0)
      if (s > 0) return s
      const boxCount = Math.max(0, Number(usedBoxAlloc[offer] || 0))
      if (boxCount > 0) {
        const total = Number(productQtyMap[offer] || 0)
        const per = Math.floor(total / boxCount)
        return per > 0 ? per : 1
      }
      const sumBoxes = usedPalletRows.filter(r => r.offer_id === offer).reduce((a, b) => a + Math.max(0, Number(b.boxes || 0)), 0)
      if (sumBoxes > 0) {
        const total = Number(productQtyMap[offer] || 0)
        const per = Math.floor(total / sumBoxes)
        return per > 0 ? per : 1
      }
      return 1
    }

    const missingBarcode = items.some(it => {
      const b = Math.max(0, Number(usedBoxAlloc[it.offer_id] || 0))
      const p = usedPalletRows.some(r => r.offer_id === it.offer_id && Number(r.boxes || 0) > 0)
      return (b > 0 || p) && !usedBoxConfig[it.offer_id]?.barcode
    })
    if (missingBarcode) {
      throw new Error(`供货 ${supply.supply_id}: 请填写所有已分配项的箱条码`)
    }

    const pack = []
    let boxCounter = 0

    items.forEach(it => {
      const count = Math.max(0, Number(usedBoxAlloc[it.offer_id] || 0))
      const barcode = usedBoxConfig[it.offer_id]?.barcode || ''
      const expiresAt = usedBoxConfig[it.offer_id]?.expires_at ? new Date(usedBoxConfig[it.offer_id].expires_at).toISOString() : undefined
      const s = resolveSingle(it.offer_id)
      for (let i = 0; i < count; i++) {
        const itemObj = { offer_id: it.offer_id, quant: 1, quantity: s }
        if (expiresAt) itemObj.expires_at = expiresAt
        pack.push({
          key: `BOX_${supplyIndex}-${barcode}_${boxCounter}`,
          value: { items: [itemObj], type: 'BOX' }
        })
        boxCounter++
      }
    })
    usedPalletRows.forEach((r, idx2) => {
      const boxes = Math.max(0, Number(r.boxes || 0))
      if (boxes > 0) {
        const barcode = usedBoxConfig[r.offer_id]?.barcode || ''
        const expiresAt = usedBoxConfig[r.offer_id]?.expires_at ? new Date(usedBoxConfig[r.offer_id].expires_at).toISOString() : undefined
        const s = resolveSingle(r.offer_id)
        const itemObj = { offer_id: r.offer_id, quant: 1, quantity: boxes * s }
        if (expiresAt) itemObj.expires_at = expiresAt
        pack.push({
          key: `PALLET_${supplyIndex}-${boxes}${barcode}_${idx2}`,
          value: { items: [itemObj], type: 'PALLET' }
        })
      }
    })
    return pack
  }

  function onExecuteAll() {
    try {
      let settings = {}
      try { settings = JSON.parse(localStorage.getItem('settings') || '{}') } catch { settings = {} }
      const client_id = settings.clientId || ''
      const api_key = settings.apiKey || ''
      if (!client_id || !api_key) { alert('缺少client_id或api_key'); return }

      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      const currentOrder = orders.find(o => String(o.order_id) === String(orderId))
      if (!currentOrder) { alert('订单未找到'); return }

      const supplyList = Array.isArray(currentOrder.supplies) ? currentOrder.supplies : []

      // Check for incomplete items
      const warnings = []
      supplyList.forEach(s => {
        const saved = s.assemble || {}
        const items = s.items || []
        const usedBoxConfig = saved.boxConfig || {}
        const usedBoxAlloc = saved.boxAlloc || {}
        const usedPalletRows = saved.palletRows || []

        items.forEach(it => {
          const total = Number(it.quantity || 0)
          const single = Number(usedBoxConfig[it.offer_id]?.single || 1)
          const boxCount = Number(usedBoxAlloc[it.offer_id] || 0)
          const palletBoxes = usedPalletRows.filter(r => r.offer_id === it.offer_id).reduce((a, b) => a + (Number(b.boxes) || 0), 0)
          const used = (boxCount + palletBoxes) * single

          if (used < total) {
            warnings.push(`供货 ${s.supply_id} - 货号 ${it.offer_id}: 已分配 ${used} / 总数 ${total}`)
          }
        })
      })

      if (warnings.length > 0) {
        const msg = "以下产品未完全装配：\n" + warnings.join("\n") + "\n\n是否继续执行？"
        if (!window.confirm(msg)) return
      }

      const payload = []

      for (let i = 0; i < supplyList.length; i++) {
        const s = supplyList[i]
        const saved = s.assemble || {}
        const hasAlloc = Object.values(saved.boxAlloc || {}).some(v => Number(v) > 0) || (saved.palletRows || []).some(r => Number(r.boxes) > 0)

        if (hasAlloc) {
          try {
            const currentSupplyIndex = i + 1
            const pack = generatePack(s, saved, currentSupplyIndex)
            payload.push({
              cargoes_pack: pack,
              warehouse_name: s.warehouse_name,
              supply_id: String(s.supply_id)
            })
          } catch (err) {
            alert(err.message)
            return
          }
        }
      }

      if (payload.length === 0) {
        alert('没有可执行的装配数据')
        return
      }

      setExecLoading(true)
      const sendData = {
        client_id,
        api_key,
        order_number: String(currentOrder.order_number),
        data: payload
      }
      console.log("sendData", sendData)
      fetch('/api/create-cargoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sendData) })
        .then(async res => {
          const text = await res.text()
          if (!res.ok) throw new Error(text || `HTTP ${res.status}`)
          alert('已发送')
        })
        .catch(err => {
          alert(`发送失败: ${String(err.message || err)}`)
        })
        .finally(() => setExecLoading(false))

    } catch (e) {
      console.error(e)
      alert('执行失败')
    }
  }


  function getSupplyUnallocated(supply) {
    const saved = supply.assemble || {}
    const items = supply.items || []
    const usedBoxConfig = saved.boxConfig || {}
    const usedBoxAlloc = saved.boxAlloc || {}
    const usedPalletRows = saved.palletRows || []

    let totalUnallocated = 0
    items.forEach(it => {
      const total = Number(it.quantity || 0)
      const single = Number(usedBoxConfig[it.offer_id]?.single || 1)
      const boxCount = Number(usedBoxAlloc[it.offer_id] || 0)
      const palletBoxes = usedPalletRows.filter(r => r.offer_id === it.offer_id).reduce((a, b) => a + (Number(b.boxes) || 0), 0)
      const used = (boxCount + palletBoxes) * single
      totalUnallocated += (total - used)
    })
    return totalUnallocated
  }

  return (
    <div className="flex flex-col gap-4">
      {execLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card text-card-foreground border border-border rounded-md px-6 py-4">执行中...</div>
        </div>
      )}
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="ghost" size="sm" className="gap-1 pl-0 text-muted-foreground hover:text-foreground" onClick={() => navigate('/')}>
          <ChevronLeft className="h-4 w-4" />
          返回列表
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="font-semibold text-lg">编辑订单 <span className="font-normal text-muted-foreground ml-2">{order.order_number || orderId}</span></div>
        <Button className="ml-auto" onClick={onExecuteAll}>执行</Button>
      </div>
      {assembleOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-4xl bg-card text-card-foreground rounded-lg border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold">编辑装配 - {currentSupply?.supply_id}</div>
              <Button variant="outline" size="sm" onClick={() => setAssembleOpen(false)}>关闭</Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2">
                <div className="font-medium">产品列表</div>
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-2/12">货号</TableHead>
                      <TableHead className="w-2/12">数量</TableHead>
                      <TableHead className="w-2/12">单箱数量</TableHead>
                      <TableHead className="w-2/12">箱数</TableHead>
                      <TableHead className="w-2/12">箱条码</TableHead>
                      <TableHead className="w-2/12">保质期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(currentSupply?.items || []).map((it) => (
                      <TableRow key={String(it.offer_id)}>
                        <TableCell className="truncate"><span className="block truncate">{it.offer_id}</span></TableCell>
                        <TableCell>{it.quantity}</TableCell>
                        <TableCell>
                          <Input type="number" min="1" value={boxConfig[it.offer_id]?.single || ''} onChange={(e) => setSingle(it.offer_id, e.target.value)} />
                        </TableCell>
                        <TableCell>{Math.floor(Number(it.quantity || 0) / single(it.offer_id))}</TableCell>
                        <TableCell>
                          <Input className={offerUsedQty(it.offer_id) > 0 && !boxConfig[it.offer_id]?.barcode ? 'border-destructive' : ''} value={boxConfig[it.offer_id]?.barcode || ''} onChange={(e) => setBarcode(it.offer_id, e.target.value)} />
                          {offerUsedQty(it.offer_id) > 0 && !boxConfig[it.offer_id]?.barcode ? <div className="text-destructive text-xs mt-1">必填</div> : null}
                        </TableCell>
                        <TableCell>
                          <DatePicker value={boxConfig[it.offer_id]?.expires_at || ''} onChange={(e) => setExpiresAt(it.offer_id, e.target.value)} />
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
                    {(currentSupply?.items || []).map((it) => {
                      const b = Number(boxAlloc[it.offer_id] || 0)
                      const qty = b * single(it.offer_id)
                      const exceed = qty > Number(it.quantity || 0)
                      return (
                        <TableRow key={`box-${String(it.offer_id)}`} className={exceed ? 'text-destructive' : ''}>
                          <TableCell className="truncate"><span className="block truncate">{it.offer_id}</span></TableCell>
                          <TableCell>
                            <Input type="number" min="0" value={boxAlloc[it.offer_id] || ''} onChange={(e) => setBoxCount(it.offer_id, e.target.value)} />
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
                      const qty = Number(r.boxes || 0) * s
                      const max = productQuantity(r.offer_id)
                      const exceed = offerUsedQty(r.offer_id) > max
                      return (
                        <TableRow key={`pal-${idx}`} className={exceed ? 'text-destructive' : ''}>
                          <TableCell className="text-center">{idx + 1}</TableCell>
                          <TableCell>
                            <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={r.offer_id} onChange={(e) => updatePalletRow(idx, { offer_id: e.target.value })}>
                              {(currentSupply?.items || []).map(it => (
                                <option key={`opt-${it.offer_id}`} value={it.offer_id}>{it.offer_id}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="0" value={r.boxes} onChange={(e) => updatePalletRow(idx, { boxes: Math.max(0, Number(e.target.value) || 0) })} />
                          </TableCell>
                          <TableCell>{qty}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => removePalletRow(idx)}>移除</Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => setAssembleOpen(false)}>取消</Button>
              <Button onClick={onSaveAssemble}>保存</Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border border-border overflow-hidden">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-3/12">供货ID</TableHead>
              <TableHead className="w-3/12">仓库</TableHead>
              <TableHead className="w-3/12 text-center">未分配产品数</TableHead>
              <TableHead className="w-3/12 text-center">编辑装配</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplies.map((s) => {
              const unallocated = getSupplyUnallocated(s)
              return (
                <TableRow key={String(s.supply_id)}>
                  <TableCell className="truncate"><span className="block truncate">{s.supply_id}</span></TableCell>
                  <TableCell className="truncate"><span className="block truncate">{s.warehouse_name || ''}</span></TableCell>
                  <TableCell className={`text-center ${unallocated !== 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                    {unallocated}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button className="w-full" variant="outline" size="sm" onClick={() => onEditAssemble(s)}>编辑装配</Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}