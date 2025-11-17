'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Building2,
  Users,
  Package,
  CreditCard,
  Calculator,
  Banknote,
  FileText,
  LayoutDashboard
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Asociados', href: '/dashboard/asociados', icon: Users },
  { name: 'Productos', href: '/dashboard/productos', icon: Package },
  { name: 'Créditos', href: '/dashboard/creditos', icon: CreditCard },
  { name: 'Liquidaciones', href: '/dashboard/liquidaciones', icon: Calculator },
  { name: 'Cancelaciones', href: '/dashboard/cancelaciones', icon: Banknote },
  { name: 'Informes', href: '/dashboard/informes', icon: FileText },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <Building2 className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">Cobranzas</span>
        </div>
        
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}