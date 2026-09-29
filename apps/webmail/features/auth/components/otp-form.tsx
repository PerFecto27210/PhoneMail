"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@phonemail/ui/components/button";
import { Input } from "@phonemail/ui/components/input";
import { Label } from "@phonemail/ui/components/label";

const RESEND_COOLDOWN_SECONDS = 30;

type OtpFormProps = {
  phoneNumber: string;
  code: string;
  error: string | null;
  isVerifying: boolean;
  isResending: boolean;
  onCodeChange: (value: string) => void;
  onVerify: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => Promise<boolean>;
  onChangePhone: () => void;
};

export function OtpForm({
  phoneNumber,
  code,
  error,
  isVerifying,
  isResending,
  onCodeChange,
  onVerify,
  onResend,
  onChangePhone,
}: OtpFormProps) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleResend() {
    if (await onResend()) setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Enter the six-digit code sent to <span className="font-medium text-foreground">{phoneNumber}</span>.
      </p>
      <form className="space-y-5" onSubmit={onVerify}>
        <div className="space-y-2">
          <Label htmlFor="verification-code">Verification code</Label>
          <Input
            id="verification-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ""))}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "otp-error" : undefined}
            required
          />
          {error && (
            <p id="otp-error" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <Button className="w-full" type="submit" disabled={isVerifying || isResending}>
          {isVerifying ? "Verifying…" : "Verify and continue"}
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <Button type="button" variant="link" className="h-auto p-0" onClick={onChangePhone}>
          Change number
        </Button>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          onClick={() => void handleResend()}
          disabled={cooldown > 0 || isResending || isVerifying}
        >
          {isResending
            ? "Sending…"
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend code"}
        </Button>
      </div>
    </div>
  );
}
