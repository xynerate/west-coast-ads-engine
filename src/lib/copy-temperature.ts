/** Creative temperature for ad copy & AI images (0 = humorous … 100 = business campaign). */

export const COPY_TEMPERATURE_DEFAULT = 50;

export const COPY_TEMPERATURE_MIN = 0;
export const COPY_TEMPERATURE_MAX = 100;

export type CopyTemperaturePresetId = "humorous" | "neutral" | "business";

export const COPY_TEMPERATURE_PRESETS: {
  id: CopyTemperaturePresetId;
  value: number;
  label: string;
  shortExample: string;
}[] = [
  {
    id: "humorous",
    value: 15,
    label: "Humorous",
    shortExample:
      "“That rug’s seen more braais than your Weber — let’s give it a proper West Coast refresh.”",
  },
  {
    id: "neutral",
    value: 50,
    label: "Neutral",
    shortExample:
      "“Friendly local team — rugs collected & returned fresh. Give us a call on 📞 082 228 9226.”",
  },
  {
    id: "business",
    value: 85,
    label: "Campaign manager",
    shortExample:
      "“Professional deep-clean for fitted carpets. Free assessment — call 082 228 9226 to book.”",
  },
];

export function clampCopyTemperature(value: number): number {
  if (!Number.isFinite(value)) return COPY_TEMPERATURE_DEFAULT;
  return Math.min(COPY_TEMPERATURE_MAX, Math.max(COPY_TEMPERATURE_MIN, Math.round(value)));
}

export function copyTemperatureBand(value: number): CopyTemperaturePresetId {
  const t = clampCopyTemperature(value);
  if (t < 34) return "humorous";
  if (t > 66) return "business";
  return "neutral";
}

export function copyTemperatureLabel(value: number): string {
  const band = copyTemperatureBand(value);
  const preset = COPY_TEMPERATURE_PRESETS.find((p) => p.id === band);
  return preset?.label ?? "Neutral";
}

export function copyTemperatureExample(value: number): string {
  const band = copyTemperatureBand(value);
  return COPY_TEMPERATURE_PRESETS.find((p) => p.id === band)?.shortExample ?? "";
}
