import { NavLink, Outlet } from 'react-router-dom'

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="text-lg font-semibold">
            ozon发货
          </NavLink>
          <nav className="flex items-center gap-4">
            <NavLink to="/" className={({isActive}) => `${isActive ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground`}>
              主页
            </NavLink>
            <NavLink to="/settings" className={({isActive}) => `${isActive ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground`}>
              设置
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}