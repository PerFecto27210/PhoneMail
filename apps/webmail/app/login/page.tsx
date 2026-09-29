
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPhoneMailAddress, saveProfile } from "../profile";

type AuthStep = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("phone");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * STEP 1
   * Phone number validation and OTP request
   */
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    // Basic phone validation
    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);

    /*
     * Simulating API request.
     *
     * Later this will become something like:
     *
     * await fetch("/api/auth/send-otp", {
     *   method: "POST",
     *   body: JSON.stringify({ phone }),
     * });
     */

    setTimeout(() => {
      setLoading(false);

      // Move to OTP screen
      setStep("otp");
    }, 1000);
  };

  /*
   * STEP 2
   * OTP validation
   */
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    // Basic OTP validation
    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    /*
     * Temporary OTP for testing.
     *
     * Later the backend will verify the OTP.
     */
    setTimeout(() => {
      setLoading(false);

      if (otp === "123456") {
        saveProfile({
          name: "PhoneMail User",
          email: getPhoneMailAddress(phone),
          phone: `+91 ${phone}`,
          photo: "",
        });
        router.replace("/mailbox");
      } else {
        setError("Invalid OTP. Please try again.");
      }
    }, 1000);
  };

  /*
   * RESEND OTP
   */
  const handleResendOtp = () => {
    setError("");
    setOtp("");

    // Temporary simulation
    alert(`A new OTP has been sent to +91 ${phone}`);
  };

  /*
   * Go back to phone number
   */
  const handleChangeNumber = () => {
    setStep("phone");
    setOtp("");
    setError("");
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        {/* BRAND */}
        <div className="text-center mb-8">

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white text-2xl font-bold shadow-sm">
            P
          </div>

          <h1 className="mt-4 text-4xl font-semibold text-gray-900">
            PhoneMail
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Your phone. Your email.
          </p>

        </div>


        {/* ========================= */}
        {/* PHONE NUMBER STEP */}
        {/* ========================= */}

        {step === "phone" && (

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">

            <div className="mb-6">

              <h2 className="text-3xl font-semibold text-gray-900">
                Welcome
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Enter your phone number to continue
              </p>

            </div>


            <form onSubmit={handlePhoneSubmit}>

              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Phone number
              </label>


              <div className="flex border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">

                <div className="flex items-center px-4 bg-gray-50 border-r border-gray-300 text-sm text-gray-600">
                  +91
                </div>

                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setPhone(value);
                    setError("");
                  }}
                  maxLength={10}
                  className="flex-1 px-4 py-3.5 outline-none text-gray-900 placeholder:text-gray-400"
                />

              </div>


              {/* ERROR */}

              {error && (
                <p className="mt-2 text-sm text-red-500">
                  {error}
                </p>
              )}


              {/* CONTINUE */}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-5 py-3.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >

                {loading ? "Sending OTP..." : "Continue"}

              </button>

            </form>


            <p className="text-center text-xs text-gray-400 mt-5">
              We&apos;ll send a one-time password to verify your number.
            </p>


            <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">

              By continuing, you agree to our{" "}

              <span className="text-blue-600 cursor-pointer hover:underline">
                Terms of Service
              </span>{" "}

              and{" "}

              <span className="text-blue-600 cursor-pointer hover:underline">
                Privacy Policy
              </span>

              .

            </p>

          </div>

        )}


        {/* ========================= */}
        {/* OTP STEP */}
        {/* ========================= */}

        {step === "otp" && (

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">

            {/* BACK BUTTON */}

            <button
              type="button"
              onClick={handleChangeNumber}
              className="text-sm text-gray-500 hover:text-gray-800 mb-6"
            >
              ← Change phone number
            </button>


            <div className="mb-6">

              <h2 className="text-xl font-semibold text-gray-900">
                Verify your number
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                We sent a 6-digit OTP to
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800">
                +91 {phone}
              </p>

            </div>


            <form onSubmit={handleOtpSubmit}>

              <label
                htmlFor="otp"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Enter OTP
              </label>


              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={otp ? "" : "Enter 6-digit OTP"}
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setOtp(value);
                  setError("");
                }}
                maxLength={6}
                className="w-full px-4 py-3.5 border border-gray-300 rounded-xl outline-none text-center tracking-[0.5em] text-lg font-bold text-gray-900 placeholder:font-bold placeholder:text-gray-600 placeholder:tracking-normal focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />


              {/* ERROR */}

              {error && (
                <p className="mt-2 text-sm text-red-500">
                  {error}
                </p>
              )}


              {/* VERIFY */}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-5 py-3.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >

                {loading ? "Verifying..." : "Verify OTP"}

              </button>

            </form>


            {/* RESEND */}

            <div className="text-center mt-5">

              <p className="text-sm text-gray-500">
                Didn&apos;t receive the OTP?
              </p>

              <button
                type="button"
                onClick={handleResendOtp}
                className="mt-1 text-sm text-blue-600 font-medium hover:underline"
              >
                Resend OTP
              </button>

            </div>


            {/* TEST INFORMATION */}

            <div className="mt-6 p-3 rounded-xl bg-gray-50 text-center">

              <p className="text-xs text-gray-400">
                Development mode
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Test OTP: <strong>123456</strong>
              </p>

            </div>

          </div>

        )}


        {/* FOOTER */}

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 PhoneMail
        </p>

      </div>

    </main>
  );
}
