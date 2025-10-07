export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden text-foreground" style={{height: 'calc(100vh - 4rem)'}}>
      {children}
    </div>
  )
}