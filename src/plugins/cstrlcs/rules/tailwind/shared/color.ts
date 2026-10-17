const OKLAB_TO_LMS = [
  [1, 0.3963377774, 0.2158037573],
  [1, -0.1055613458, -0.0638541728],
  [1, -0.0894841775, -1.291485548],
];

const LMS_TO_LINEAR_SRGB = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
];

const LINEAR_SRGB_TO_LMS = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];

const LMS_TO_OKLAB_AB = [
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
];

const LUMINANCE_WEIGHTS = [0.2126, 0.7152, 0.0722];

function dot(row: number[], vector: number[]) {
  let sum = 0;

  for (const [index, weight] of row.entries()) {
    sum += weight * (vector[index] ?? 0);
  }

  return sum;
}

function srgbToLinear(value: number) {
  if (value <= 0.04045) {
    return value / 12.92;
  }

  return ((value + 0.055) / 1.055) ** 2.4;
}

function channel(text: string, scale: number) {
  if (text === "none") {
    return 0;
  }

  if (text.endsWith("%")) {
    return (Number(text.slice(0, -1)) / 100) * scale;
  }

  return Number(text.replace(/deg$/v, ""));
}

function hexToLinear(digits: string) {
  if (![3, 4, 6, 8].includes(digits.length)) {
    return;
  }

  const pairs =
    digits.length > 4
      ? (digits.match(/../gv) ?? [])
      : Array.from(digits, (digit) => `${digit}${digit}`);

  if (pairs.length === 4 && pairs[3] !== "ff") {
    return;
  }

  return pairs.slice(0, 3).map((pair) => srgbToLinear(Number.parseInt(pair, 16) / 255));
}

function oklchToLinear([lightness = "0", chroma = "0", hue = "0"]: string[]) {
  const angle = (channel(hue, 360) * Math.PI) / 180;

  const oklab = [
    channel(lightness, 1),
    channel(chroma, 0.4) * Math.cos(angle),
    channel(chroma, 0.4) * Math.sin(angle),
  ];

  const lms = OKLAB_TO_LMS.map((row) => dot(row, oklab) ** 3);

  return LMS_TO_LINEAR_SRGB.map((row) => Math.min(1, Math.max(0, dot(row, lms))));
}

function functionToLinear(name: string, body: string) {
  const parts = body.split(/[\s,\/]+/v).filter(Boolean);
  const alpha = parts[3];

  if (parts.length < 3 || (alpha !== undefined && channel(alpha, 1) < 1)) {
    return;
  }

  if (name === "oklch") {
    return oklchToLinear(parts);
  }

  return parts.slice(0, 3).map((part) => srgbToLinear(channel(part, 255) / 255));
}

function toLinear(color: string) {
  const { digits } = /^#(?<digits>[\da-f]+)$/v.exec(color)?.groups ?? {};

  if (digits !== undefined) {
    return hexToLinear(digits);
  }

  const { body, name } = /^(?<name>rgba?|oklch)\((?<body>[^\(\)]*)\)$/v.exec(color)?.groups ?? {};

  if (name === undefined || body === undefined) {
    return;
  }

  return functionToLinear(name, body);
}

export function luminance(color: string | undefined) {
  const linear = toLinear(color?.trim().toLowerCase() ?? "");

  if (linear === undefined) {
    return;
  }

  return dot(LUMINANCE_WEIGHTS, linear);
}

export function contrastRatio(first: number, second: number) {
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function chromaOf(color: string | undefined) {
  const linear = toLinear(color?.trim().toLowerCase() ?? "");

  if (linear === undefined) {
    return;
  }

  const lms = LINEAR_SRGB_TO_LMS.map((row) => Math.cbrt(dot(row, linear)));
  const [greenRed = 0, blueYellow = 0] = LMS_TO_OKLAB_AB.map((row) => dot(row, lms));

  return Math.hypot(greenRed, blueYellow);
}
