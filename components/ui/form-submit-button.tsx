"use client";

import { type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface FormSubmitButtonProps extends ButtonProps {
    pendingText: string;
    children: ReactNode;
}

export function FormSubmitButton({
    children,
    pendingText,
    disabled,
    type,
    ...props
}: FormSubmitButtonProps) {
    const { pending } = useFormStatus();

    return (
        <Button type={type ?? "submit"} disabled={disabled || pending} {...props}>
            {pending ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
            {pending ? pendingText : children}
        </Button>
    );
}
