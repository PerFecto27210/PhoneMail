"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AlertDescription,
} from "@phonemail/ui/components/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@phonemail/ui/components/card";
import { requestOtp, verifyOtp } from "../api/auth";
import { OtpForm } from "./otp-form";
import { PhoneForm } from "./phone-form";

type AuthFormProps = {
  sessionExpired: boolean;
};

export function AuthForm({ sessionExpired }: AuthFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsRequestingOtp(true);
    try {
      await requestOtp(phoneNumber);
      setStep("otp");
      setCode("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not send a verification code. Try again.",
      );
    } finally {
      setIsRequestingOtp(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsVerifyingOtp(true);
    try {
      const verified = await verifyOtp(phoneNumber, code);
      if (!verified) throw new Error("That code is invalid or expired. Check it and try again.");
      // Let the authenticated server route choose the next step. Returning
      // users should go to their inbox; incomplete accounts are redirected to
      // the first onboarding step they still need.
      router.replace("/conversation");
      router.refresh();
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "We could not verify that code. Try again.",
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleResendOtp(): Promise<boolean> {
    setError(null);
    setIsResendingOtp(true);
    try {
      await requestOtp(phoneNumber);
      return true;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not send another code. Try again shortly.",
      );
      return false;
    } finally {
      setIsResendingOtp(false);
    }
  }

  function handleChangePhone() {
    setError(null);
    setStep("phone");
  }

  return (
    <Card className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-card p-0 shadow-xl md:min-h-[680px] md:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-background via-accent to-secondary p-12 md:flex lg:p-16">
        <div className="relative z-10 flex items-center gap-3 text-2xl font-bold tracking-tight"><span className="grid size-10 place-items-center rounded-full bg-primary text-lg text-primary-foreground">p</span>PhoneMail</div>
        <div className="relative z-10 max-w-lg pb-10">
          <p className="text-4xl font-semibold leading-tight tracking-tight text-foreground lg:text-5xl">Your phone number is your <span className="text-primary">email identity.</span></p>
          <p className="mt-5 max-w-md text-lg leading-8 text-muted-foreground">A calmer, more personal way to stay in touch. Messages that feel like email, delivered as simply as a text.</p>
        </div>
        <div aria-hidden="true" className="absolute -bottom-12 -right-12 size-80 rounded-full border border-primary/15 bg-background/25" />
        <div aria-hidden="true" className="absolute bottom-10 right-20 size-48 rounded-full border border-primary/20 bg-background/30" />
        <div aria-hidden="true" className="absolute bottom-28 right-32 size-24 rounded-[2rem] rotate-12 bg-primary/15" />
        <div className="relative z-10 text-sm text-muted-foreground">Connect simply. Stay close.</div>
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-12 md:px-14 lg:px-20">
      <div className="w-full max-w-md">
      <div className="mb-10 flex items-center gap-3 text-xl font-bold tracking-tight md:hidden"><span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">p</span>PhoneMail</div>
      <CardHeader className="space-y-2 px-0">
        <p className="text-sm font-semibold tracking-wide text-primary">{step === "phone" ? "WELCOME TO PHONEMAIL" : "SECURE SIGN IN"}</p>
        <CardTitle className="text-3xl tracking-tight">{step === "phone" ? "Let’s get you connected" : "Check your messages"}</CardTitle>
        <CardDescription className="text-base">
          {step === "phone" ? "Your phone number is your email address." : "We sent a one-time verification code to your phone."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-0 pt-5">
        {sessionExpired && step === "phone" && (
          <Alert variant="destructive">
            <AlertDescription>Your session expired. Sign in again to continue.</AlertDescription>
          </Alert>
        )}
        {step === "phone" ? (
          <PhoneForm
            phoneNumber={phoneNumber}
            error={error}
            isSubmitting={isRequestingOtp}
            onPhoneNumberChange={setPhoneNumber}
            onSubmit={handleRequestOtp}
          />
        ) : (
          <OtpForm
            key={phoneNumber}
            phoneNumber={phoneNumber}
            code={code}
            error={error}
            isVerifying={isVerifyingOtp}
            isResending={isResendingOtp}
            onCodeChange={setCode}
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
            onChangePhone={handleChangePhone}
          />
        )}
      </CardContent>
      <p className="mt-12 text-center text-xs text-muted-foreground">By continuing, you agree to PhoneMail’s Terms and Privacy Policy.</p>
      </div>
      </section>
    </Card>
  );
}
