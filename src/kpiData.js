import {
  TrendingUp, ShoppingCart, MousePointerClick, Star,
  ScanEye, BookOpen, MapPin, Users, FileText, Clock,
  Layers, Target, Activity, Zap, Building2, Newspaper, Timer,
  RotateCcw, CalendarRange,
} from 'lucide-react'

export const KPI_GROUPS = [
  {
    id: 'performance', label: 'Performance', icon: TrendingUp,
    items: [
      { id: 'impressions',     label: 'Impressions',      icon: ScanEye },
      { id: 'readings',        label: 'Readings',         icon: BookOpen },
      { id: 'visits',          label: 'Visits',           icon: MapPin },
      { id: 'unique-visitors', label: 'Unique Visitors',  icon: Users },
      { id: 'page-views',      label: 'Page Views',       icon: FileText },
      { id: 'bounce-rate',     label: 'Bounce Rate',      icon: Activity },
      { id: 'session-dur',     label: 'Session Duration', icon: Clock },
      { id: 'return-rate',     label: 'Return Rate',      icon: RotateCcw },
    ],
  },
  {
    id: 'quality', label: 'Quality – Timings & Pages', icon: Timer,
    items: [
      { id: 'avg-read-pages', label: 'Avg Read Pages',  icon: BookOpen },
      { id: 'secs-per-page',  label: 'Secs per Page',   icon: Clock },
      { id: 'avg-time-page',  label: 'Avg Time/Page',   icon: Timer },
      { id: 'pages-session',  label: 'Pages/Session',   icon: Layers },
      { id: 'completion',     label: 'Completion Rate', icon: Target },
    ],
  },
  {
    id: 'next-sections', label: 'Next Sections', icon: Layers,
    items: [
      { id: 'ns-impressions',  label: 'Impressions',  icon: ScanEye },
      { id: 'ns-clicks',       label: 'Clicks',       icon: MousePointerClick },
      { id: 'ns-top-products', label: 'Top Products', icon: Star },
    ],
  },
  {
    id: 'interactions', label: 'Interactions', icon: Zap,
    items: [
      { id: 'clicks-products', label: 'Clicks Products', icon: ShoppingCart },
      { id: 'clicks-actions',  label: 'Clicks Actions',  icon: Zap },
      { id: 'avg-clicks',      label: 'Avg Clicks',      icon: MousePointerClick },
    ],
  },
  {
    id: 'socio-demo', label: 'Socio-Demographic', icon: Users,
    items: [
      { id: 'potential-reach', label: 'Potential Reach', icon: Target },
      { id: 'age',             label: 'Age',             icon: CalendarRange },
      { id: 'gender',          label: 'Gender',          icon: Users },
    ],
  },
  {
    id: 'paper-digital', label: 'Switch Paper to Digital', icon: Newspaper,
    items: [
      { id: 'pd-potential-reach', label: 'Potential Reach', icon: Target },
      { id: 'pd-age',             label: 'Age',             icon: CalendarRange },
      { id: 'pd-gender',          label: 'Gender',          icon: Users },
    ],
  },
  {
    id: 'points-of-sale', label: 'Points of Sale', icon: MapPin,
    items: [
      { id: 'store-visits', label: 'Store Visits', icon: Building2 },
      { id: 'conversions',  label: 'Conversions',  icon: TrendingUp },
      { id: 'pos-revenue',  label: 'Revenue',      icon: Activity },
      { id: 'pos-traffic',  label: 'Traffic',      icon: MapPin },
    ],
  },
]

export const KPI_TOTAL = 29

export const KPI_BY_ID = {}
KPI_GROUPS.forEach(g => g.items.forEach(item => { KPI_BY_ID[item.id] = item }))

export const DEFAULT_WIDGET = {
  displayMode: 'numbers',
  detailView: 'fixed',
  tooltip: '',
  showKpiIcon: true,
  visualProgressBar: true,
  fromWhichSplit: false,
  vsPreviousPeriod: true,
  vsTimeMode: 'set-time-frame',
  vsStartDate: '',
  vsEndDate: '',
  stretchWidth: false,
  stretchHeight: false,
}
