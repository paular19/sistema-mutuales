"use client";

import { type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface FormSubmitButtonProps extends ButtonProps {
    pendingText: string;
    children: ReactNode;
    pending?: boolean;
}

export function FormSubmitButton({
    children,
    pendingText,
    pending = false,
    disabled,
    type,
    ...props
}: FormSubmitButtonProps) {
    return (
        <Button type={type ?? "submit"} disabled={disabled || pending} {...props}>
            {pending ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
            {pending ? pendingText : children}
        </Button>
    );
}
