import { Button } from "@react-email/components";

interface EmailButtonProps {
  href: string;
  children: string;
  variant?: "primary" | "secondary";
}

/**
 * Styled button component for email CTAs.
 */
export function EmailButton({ href, children, variant = "primary" }: EmailButtonProps) {
  const baseClasses = "rounded-lg px-6 py-3 text-center font-semibold no-underline";

  const variantClasses = {
    primary: "bg-gray-600 text-white",
    secondary: "bg-gray-200 text-gray-800",
  };

  return (
    <Button href={href} className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </Button>
  );
}
