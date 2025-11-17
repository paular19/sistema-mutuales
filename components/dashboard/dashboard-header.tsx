import { UserButton } from "@clerk/nextjs";
import type { User } from "@clerk/nextjs/server";

interface DashboardHeaderProps {
  context: {
    user: User;
    usuario: any;
    mutualId: number | null; // ✅ aceptar null
  };
}

export function DashboardHeader({ context }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex justify-between items-center px-8 py-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {context.usuario?.mutual?.nombre || "Mutual"}
          </h1>
          <p className="text-sm text-gray-500">
            {context.usuario?.nombre} {context.usuario?.apellido}{" "}
            {context.usuario?.rol ? `- ${context.usuario.rol}` : ""}
          </p>
        </div>

        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-10 w-10",
            },
          }}
        />
      </div>
    </header>
  );
}
