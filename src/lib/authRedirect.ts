const MOBILE_AUTH_CALLBACK_URL = "camaranaomao://auth/callback";

const isRunningInsideNativeWebView = () =>
  typeof window !== "undefined" && "ReactNativeWebView" in window;

export const getAuthRedirectUrl = () => {
  if (isRunningInsideNativeWebView()) {
    return MOBILE_AUTH_CALLBACK_URL;
  }

  return `${window.location.origin}/login`;
};

/** URL passada ao Supabase em resetPasswordForEmail — deve bater com o link do e-mail. */
export const getPasswordRecoveryRedirectUrl = () => {
  if (typeof window === "undefined") {
    return "/nova-senha";
  }
  return `${window.location.origin}/nova-senha`;
};
