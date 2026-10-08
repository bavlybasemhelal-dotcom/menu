export function whatsappLink(
  number: string,
  name = "",
  url = "",
  locale: "ar" | "en" = "ar",
) {
  if (!/^[1-9][0-9]{6,14}$/.test(number)) return null;
  const text = name
    ? locale === "ar"
      ? `مرحباً، أريد الاستفسار عن ${name}: ${url}`
      : `Hello, I would like to ask about ${name}: ${url}`
    : "";
  return `https://wa.me/${number}${text ? "?text=" + encodeURIComponent(text) : ""}`;
}
export function safeFacebook(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" &&
      ["facebook.com", "www.facebook.com", "m.facebook.com"].includes(
        u.hostname,
      )
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export const whatsappUrl = whatsappLink;
export function isDriveAssetUrl(url: string) {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.searchParams.has("access_token") &&
      !u.searchParams.has("idToken") &&
      ((u.hostname === "drive.google.com" && u.pathname === "/uc") ||
        (u.hostname === "drive.usercontent.google.com" &&
          u.pathname === "/download")) &&
      u.searchParams.get("export") === "view" &&
      /^[a-zA-Z0-9_-]+$/.test(u.searchParams.get("id") || "") &&
      [...u.searchParams.keys()].every((key) =>
        ["export", "id", "resourcekey"].includes(key),
      )
    );
  } catch {
    return false;
  }
}
