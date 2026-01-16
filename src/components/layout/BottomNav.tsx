import { Home, Trophy, Users, BarChart3, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

const navItems = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/jogos', icon: Trophy, label: 'Jogos' },
  { to: '/equipas', icon: Users, label: 'Equipas' },
  { to: '/kpis', icon: BarChart3, label: 'KPIs' },
  { to: '/definicoes', icon: Settings, label: 'Definições' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card safe-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground transition-colors hover:text-foreground"
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
