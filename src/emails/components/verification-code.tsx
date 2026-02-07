import { Section, Text } from "@react-email/components";

interface VerificationCodeProps {
  code: string;
}

/**
 * Styled verification code display component.
 * Used for 2FA codes, email verification, etc.
 */
export function VerificationCode({ code }: VerificationCodeProps) {
  return (
    <Section className="my-section">
      <Text className="m-0 text-4xl font-bold">{code}</Text>
    </Section>
  );
}
