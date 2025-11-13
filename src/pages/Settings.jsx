import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

export default function Settings() {
  const [clientId, setClientId] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('settings') || '{}')
    return saved.clientId || ''
  })
  const [apiKey, setApiKey] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('settings') || '{}')
    return saved.apiKey || ''
  })

  function onSave() {
    localStorage.setItem('settings', JSON.stringify({ clientId, apiKey }))
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>API 设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Client-Id</Label>
            <Input id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="输入您的Client-Id" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">Api-Key</Label>
            <Input id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="输入您的Api-Key" />
          </div>
          <Button onClick={onSave}>保存</Button>
        </CardContent>
      </Card>
    </div>
  )
}