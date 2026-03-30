"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteButtonProps {
  id: number;
  action: (id: number) => Promise<{ error?: string } | void>;
  confirmMessage?: string;
  entityName?: string; // 👈 opcional, para personalizar
}

export function DeleteButton({
  id,
  action,
  confirmMessage,
  entityName = "registro",
}: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await action(id);

      if (result && "error" in result && result.error) {
        toast.error(`No se pudo eliminar el ${entityName}`, {
          description: result.error,
        });
      } else {
        toast.success(`${entityName} eliminado correctamente`);
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700"
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Seguro que deseas eliminar este {entityName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirmMessage ||
              `Esta acción no se puede deshacer. Se eliminará el ${entityName} permanentemente.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
            {isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
