import { ReactNode } from "react";

type LoadingButtonProps = {
  children: ReactNode;
  isLoading?: boolean;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

export function LoadingButton({ children, isLoading, className = "", type = "button", onClick, disabled }: LoadingButtonProps) {
  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled || isLoading}>
      {isLoading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}
    </button>
  );
}
