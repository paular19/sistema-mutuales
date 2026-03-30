"use client";

import { type ReactNode, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, type ButtonProps } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface NavigationButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
    href: string;
    children: ReactNode;
    pendingText?: string;
    replace?: boolean;
}

export function NavigationButton({
    href,
    children,
    pendingText,
    replace = false,
    disabled,
    type,
    ...props
}: NavigationButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleNavigate = () => {
        if (isPending) return;

        startTransition(() => {
            if (replace) {
                router.replace(href);
                return;
            }

            router.push(href);
        });
    };

    return (
        <Button
            type={type ?? "button"}
            onClick={handleNavigate}
            disabled={disabled || isPending}
            {...props}
        >
            {isPending ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
            {isPending ? pendingText ?? null : children}
        </Button>
    );
}