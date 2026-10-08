type RGB = [number, number, number];
const rgb = (hex: string): RGB =>
  hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16)) as RGB;
const hex = (v: RGB) =>
  "#" + v.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
const mix = (a: RGB, b: RGB, amount: number): RGB =>
  a.map((v, i) => Math.round(v * (1 - amount) + b[i] * amount)) as RGB;
function luminance(color: string) {
  const linear = rgb(color).map((n) => {
    const v = n / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
export function contrastRatio(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readableBrandColor(raw: string, theme: string) {
  const dark = theme === "dark",
    surface = dark ? "#19231d" : "#ffffff";
  const target = dark ? rgb("#ffffff") : rgb("#000000");
  let color = raw;
  // Keep the stored brand hue; adjust only its displayed tone for text on both surfaces.
  for (let step = 0; step <= 100; step++) {
    color = hex(mix(rgb(raw), target, step / 100));
    const soft = hex(mix(rgb(surface), rgb(color), 0.12));
    if (
      contrastRatio(color, surface) >= 4.5 &&
      contrastRatio(color, soft) >= 4.5
    )
      break;
  }
  const foreground =
    contrastRatio(color, "#ffffff") > contrastRatio(color, "#102017")
      ? "#ffffff"
      : "#102017";
  return { color, foreground };
}
