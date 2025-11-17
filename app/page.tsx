import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CreditCard, Users, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Sistema Cobranzas</span>
            </div>
            <div className="flex space-x-4">
              <Button asChild variant="ghost">
                <Link href="/sign-in">Iniciar Sesión</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Registrarse</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Gestión de Cobranzas
            <span className="block text-blue-600">para Mutuales</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            Plataforma completa para la gestión de créditos, asociados y cobranzas.
            Control total de sus operaciones financieras con seguridad multi-tenant.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button asChild size="lg">
              <Link href="/sign-up">Comenzar Ahora</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/sign-in">Acceder al Sistema</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-32 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <CardTitle>Gestión de Asociados</CardTitle>
              </div>
              <CardDescription>
                Administre el padrón completo de asociados con toda su información personal y financiera.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Registro completo de datos personales</li>
                <li>• Historial de declaraciones juradas</li>
                <li>• Búsqueda y filtrado avanzado</li>
                <li>• Paginación para grandes volúmenes</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CreditCard className="h-8 w-8 text-green-600" />
                <CardTitle>Control de Créditos</CardTitle>
              </div>
              <CardDescription>
                Gestione todos los créditos otorgados con seguimiento detallado de cuotas y pagos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Otorgamiento de créditos</li>
                <li>• Cálculo automático de cuotas</li>
                <li>• Seguimiento de pagos</li>
                <li>• Estados y vencimientos</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <CardTitle>Liquidaciones y Reportes</CardTitle>
              </div>
              <CardDescription>
                Genere liquidaciones y compare con cobranzas reales para un control financiero preciso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Liquidaciones por fecha de corte</li>
                <li>• Comparación con cobrado real</li>
                <li>• Resúmenes por producto</li>
                <li>• Informes personalizables</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Security Notice */}
        <div className="mt-20 p-8 bg-blue-50 rounded-2xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Seguridad Multi-Tenant
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Cada mutual opera de forma completamente aislada. Row Level Security garantiza
              que solo pueda acceder a los datos de su propia organización.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}