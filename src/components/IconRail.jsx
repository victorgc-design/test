import { LayoutDashboard, Megaphone, CalendarRange, Blend, LandPlot, BadgePercent, BadgePlus } from 'lucide-react'

const railItems = [
  { title: 'Dashboards',   icon: LayoutDashboard },
  { title: 'Campaigns',    icon: Megaphone },
  { title: 'Calendar',     icon: CalendarRange },
  { title: 'Analytics',    icon: Blend },
  { title: 'Distribution', icon: LandPlot },
  { title: 'Promotions',   icon: BadgePercent },
]

export default function IconRail() {
  return (
    <nav className="icon-rail">
      {railItems.map(({ title, icon: Icon }) => (
        <button key={title} className="rail-btn" title={title}>
          <Icon size={24} />
        </button>
      ))}
      <div className="rail-spacer" />
      <button className="rail-btn plus" title="Add">
        <BadgePlus size={24} />
      </button>
    </nav>
  )
}
