import { LayoutDashboard, Megaphone, CalendarRange, Blend, LandPlot, BadgePercent, BadgePlus } from 'lucide-react'

const railItems = [
  { title: 'Dashboards',   icon: LayoutDashboard },
  { title: 'Campaigns',    icon: Megaphone },
  { title: 'Calendar',     icon: CalendarRange },
  { title: 'Analytics',    icon: Blend },
  { title: 'Distribution', icon: LandPlot },
  { title: 'Promotions',   icon: BadgePercent },
]

function ShopfullyLogo() {
  return (
    <svg
      width="39.282"
      height="24"
      viewBox="0 0 39.282 24.0183"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Asterisk — left portion */}
      <path
        d="M23.6297 8.65641L23.0749 7.68154C22.9533 7.4681 22.6931 7.38082 22.4703 7.47918L16.9168 9.92646L17.8343 0.762872C17.8753 0.35477 17.559 0 17.1545 0H11.8163C11.4119 0 11.0955 0.35477 11.1365 0.762872L12.0096 9.48718L5.43954 4.79282C5.11852 4.56349 4.67308 4.65498 4.466 4.99374L2.22795 8.64605C2.01134 8.99939 2.14867 9.46574 2.52098 9.64031L9.80559 13.0598L0.411338 17.1999C0.0424146 17.3628 -0.109278 17.8117 0.0847734 18.1692L3.06067 23.659C3.26016 24.0271 3.73359 24.1316 4.06559 23.8823L12.8095 17.3163L13.4285 23.3474C13.4538 23.5947 13.6594 23.7824 13.904 23.7824H15.0653C15.3105 23.7824 15.5155 23.5948 15.5408 23.3474L16.2841 16.1024L20.2526 17.9649C20.4773 18.0703 20.7437 17.9843 20.8674 17.7675L21.4379 16.7648C21.5615 16.5473 21.5014 16.2702 21.2992 16.1259L17.7611 13.5975L23.4997 9.28841C23.6951 9.14154 23.7511 8.86995 23.6295 8.65579V8.65651L23.6297 8.65641Z"
        fill="#810AE6"
      />
      {/* S — right portion, offset by 25.63px */}
      <path
        transform="translate(25.63, 0)"
        d="M0.0045841 16.9955C0.248892 21.5269 2.64376 24.0183 6.72397 24.0183C10.8042 24.0183 13.6321 21.4116 13.6321 17.3338C13.6321 10.2823 5.06407 9.99897 5.06407 6.54287C5.06407 5.43877 5.66356 4.81477 6.72397 4.81477C7.64797 4.81477 8.16438 5.55159 8.30038 6.79723C8.35587 7.27969 8.57238 7.53405 9.00827 7.53405H12.6246C13.0881 7.53405 13.3325 7.27959 13.3049 6.76841C13.0881 2.4362 10.8846 0 6.72161 0C2.55863 0 0.0298151 2.60656 0.0298151 6.68441C0.0298151 13.5655 8.59761 13.8488 8.59761 17.4754C8.59761 18.5795 7.89002 19.2035 6.72161 19.2035C5.87771 19.2035 5.19771 18.4115 5.03412 16.9666C4.9533 16.4842 4.73453 16.2297 4.29864 16.2297H0.682121C0.218839 16.2297 -0.0255715 16.4842 0.00212078 16.9954"
        fill="#810AE6"
      />
    </svg>
  )
}

export default function IconRail() {
  return (
    <nav className="icon-rail">
      <div className="rail-logo-area">
        <ShopfullyLogo />
      </div>

      <div className="rail-destinations">
        {railItems.map(({ title, icon: Icon }) => (
          <button key={title} className="rail-btn" title={title}>
            <Icon size={24} />
          </button>
        ))}
        <button className="rail-btn plus" title="Add">
          <BadgePlus size={24} />
        </button>
      </div>
    </nav>
  )
}
