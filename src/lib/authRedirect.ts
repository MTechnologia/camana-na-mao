const MOBILE_AUTH_CALLBACK_URL = "camaranaomao://auth/callback";

const isRunningInsideNativeWebView = () =>
  typeof window !== "undefined" && "ReactNativeWebView" in window;

export const getAuthRedirectUrl = () => {
  if (isRunningInsideNativeWebView()) {
    return MOBILE_AUTH_CALLBACK_URL;
  }

  return `${window.location.origin}/login`;
};
