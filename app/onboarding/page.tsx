// app/onboarding/page.tsx
import { createMutualAction } from "@/lib/actions/onboarding";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Crear Nueva Mutual
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Complete los datos para crear su mutual
          </p>
        </div>

        {/* ✅ Server Action directo */}
        <form action={createMutualAction} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                Nombre de la Mutual
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Ingrese el nombre de la mutual"
              />
            </div>

            <div>
              <label htmlFor="cuit" className="block text-sm font-medium text-gray-700">
                CUIT
              </label>
              <input
                id="cuit"
                name="cuit"
                type="text"
                required
                pattern="[0-9]{2}-[0-9]{8}-[0-9]{1}"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="XX-XXXXXXXX-X"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center rounded-md bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Crear Mutual
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

