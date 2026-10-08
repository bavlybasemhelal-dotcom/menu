import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { Eye, EyeOff, LockKeyhole, ArrowRight } from "lucide-react";
import { auth } from "../../integrations/firebase/client";
import { useUI } from "../../app/context";
import { Brand, Button, Field, Notice, useAction } from "../../components/ui";
export default function Login() {
  const { t, admin, authLoading } = useUI(),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [remember, setRemember] = useState(false),
    a = useAction();
  if (admin && !authLoading) return <Navigate to="/admin" replace />;
  return (
    <div className="login-page">
      <div className="login-card">
        <Brand />
        <h1>{t("أهلاً بعودتك", "Welcome back")}</h1>
        <p>
          {t(
            "ادخل لإدارة كتالوجك وعروضك من مكان واحد",
            "Manage your catalog and offers in one place",
          )}
        </p>
        {!auth && (
          <Notice error>
            {t("إعداد Firebase غير مكتمل", "Firebase configuration is missing")}
          </Notice>
        )}
        {a.error && <Notice error>{a.error}</Notice>}
        {a.success && <Notice>{a.success}</Notice>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void a.run(async () => {
              if (!auth)
                throw Error(t("Firebase غير متاح", "Firebase unavailable"));
              await setPersistence(
                auth,
                remember ? browserLocalPersistence : browserSessionPersistence,
              );
              await signInWithEmailAndPassword(auth, email, password);
              setPassword("");
            }, "");
          }}
        >
          <Field label={t("البريد الإلكتروني", "Email")}>
            <input
              type="email"
              autoComplete="username"
              dir="ltr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t("كلمة المرور", "Password")}>
            <div className="password-field">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={t(
                  "إظهار أو إخفاء كلمة المرور",
                  "Show or hide password",
                )}
              >
                {show ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </Field>
          <div
            className="button-row"
            style={{ justifyContent: "space-between" }}
          >
            <label className="check-field">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              {t("تذكرني", "Remember me")}
            </label>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                a.run(
                  async () => {
                    if (!auth || !email)
                      throw Error(
                        t("أدخل البريد أولاً", "Enter your email first"),
                      );
                    await sendPasswordResetEmail(auth, email);
                  },
                  t(
                    "لو الحساب موجود هتوصلك رسالة لاستعادة كلمة المرور",
                    "If the account exists, a password reset email will arrive",
                  ),
                )
              }
            >
              {t("نسيت كلمة المرور؟", "Forgot password?")}
            </button>
          </div>
          <Button className="button-primary" disabled={a.busy || !auth}>
            <LockKeyhole size={18} />
            {a.busy
              ? t("جارٍ الدخول…", "Signing in…")
              : t("دخول لوحة الإدارة", "Sign in")}
          </Button>
        </form>
        <p className="scroll-note">
          {t(
            "الدخول متاح لحساب المالك المصرح له فقط",
            "Access is restricted to the authorized owner",
          )}
        </p>
        <Link className="back-link" style={{ marginTop: 20 }} to="/">
          <ArrowRight size={16} />
          {t("الرجوع للمحل", "Back to store")}
        </Link>
      </div>
    </div>
  );
}
