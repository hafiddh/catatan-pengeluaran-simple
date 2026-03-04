import { LoginWithGoogle } from "@/service/login";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { navigate } from "astro:transitions/client";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

export const LoginPage = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const onSuccessGoogle = async (credentialResponse: CredentialResponse) => {
    setGoogleError("");
    setIsLoggingIn(true);
    try {
      const result = await LoginWithGoogle(credentialResponse.credential || "");

      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("auth_user", JSON.stringify(result.user));
      navigate("/dashboard");
    } catch (error: unknown) {
      setGoogleError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat login Google",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const onErrorGoogle = () => {
    setGoogleError("Login Google gagal. Coba ulangi lagi.");
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-100 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-lg p-6 dark:bg-slate-900 dark:border-slate-700">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-secondaryBkn/15 text-secondaryBkn flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            Masuk ke Aplikasi
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-300">
            Lanjutkan masuk menggunakan akun Google Anda.
          </p>
        </div>

        <div className="space-y-3">
          {googleError && (
            <p className="text-xs text-red-500 font-medium text-center">
              {googleError}
            </p>
          )}

          {isLoggingIn && (
            <div className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold flex items-center justify-center gap-2 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memproses...
            </div>
          )}

          <div className="flex justify-center mt-2">
            <GoogleLogin
              onSuccess={onSuccessGoogle}
              onError={onErrorGoogle}
              text="signin_with"
              shape="pill"
              size="large"
            />
          </div>
        </div>
      </section>
    </main>
  );
};
