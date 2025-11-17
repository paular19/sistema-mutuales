export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Acceso no autorizado
        </h1>
        <p className="text-gray-700 mb-6">
          Tu cuenta no está habilitada para acceder al sistema de cobranzas.
          <br />
          Si creés que esto es un error, contactá al administrador.
        </p>
        <a
          href="/sign-in"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Volver al inicio de sesión
        </a>
      </div>
    </div>
  );
}
