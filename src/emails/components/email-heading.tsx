import { Heading } from "react-email";

interface EmailHeadingProps {
  children: string;
}

/**
 * Consistent heading style for email templates.
 */
export function EmailHeading({ children }: EmailHeadingProps) {
  return <Heading className="mb-space-lg text-xl font-medium text-gray-800">{children}</Heading>;
}
