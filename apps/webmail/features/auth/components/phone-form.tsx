import type { FormEvent } from "react";
import { Button } from "@phonemail/ui/components/button";
import { Input } from "@phonemail/ui/components/input";
import { Label } from "@phonemail/ui/components/label";

type PhoneFormProps = {
  phoneNumber: string;
  error: string | null;
  isSubmitting: boolean;
  onPhoneNumberChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function PhoneForm({
  phoneNumber,
  error,
  isSubmitting,
  onPhoneNumberChange,
  onSubmit,
}: PhoneFormProps) {
  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="phone-number">Phone number</Label>
        <Input
          id="phone-number"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+91 98765 43210"
          value={phoneNumber}
          onChange={(event) => onPhoneNumberChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "phone-error" : undefined}
          required
        />
        {error && (
          <p id="phone-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending code…" : "Continue"}
      </Button>
    </form>
  );
}
