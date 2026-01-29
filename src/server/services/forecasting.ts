import { addDays, startOfDay, subDays } from "@/server/services/time";

export type ForecastInput = {
  dailySales: { date: Date; qty: number }[];
  horizonDays: number;
  windowDays: number;
  useWeekdayWeighting?: boolean;
  samples?: number;
  seed?: number;
};

export type ForecastResult = {
  p50Daily: number;
  p90Daily: number;
  averageDaily: number;
  variability: number;
  windowDays: number;
};

const seededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 48271) % 0x7fffffff;
    return state / 0x7fffffff;
  };
};

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[index];
};

const stdDev = (values: number[]) => {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

export const buildDailySeries = (
  sales: { date: Date; qty: number }[],
  windowDays: number,
) => {
  const end = startOfDay(new Date());
  const start = subDays(end, windowDays - 1);
  const map = new Map<string, number>();

  for (const sale of sales) {
    const day = startOfDay(sale.date).toISOString();
    map.set(day, (map.get(day) ?? 0) + sale.qty);
  }

  const series: { date: Date; qty: number }[] = [];
  for (let i = 0; i < windowDays; i += 1) {
    const day = addDays(start, i);
    const key = startOfDay(day).toISOString();
    series.push({ date: day, qty: map.get(key) ?? 0 });
  }

  return series;
};

export const forecastDemand = ({
  dailySales,
  horizonDays: _horizonDays,
  windowDays,
  useWeekdayWeighting = true,
  samples = 500,
  seed,
}: ForecastInput): ForecastResult => {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;
  const salesValues = dailySales.map((day) => day.qty);
  const weights = dailySales.map((day) => {
    if (!useWeekdayWeighting) return 1;
    const weekday = day.date.getDay();
    const todayWeekday = new Date().getDay();
    return weekday === todayWeekday ? 1.4 : 1;
  });

  const weightSum = weights.reduce((sum, w) => sum + w, 0) || 1;
  const weightedPick = () => {
    let roll = rng() * weightSum;
    for (let i = 0; i < salesValues.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return salesValues[i];
    }
    return salesValues[salesValues.length - 1] ?? 0;
  };

  const sampleMeans: number[] = [];
  for (let i = 0; i < samples; i += 1) {
    const sample: number[] = [];
    for (let j = 0; j < windowDays; j += 1) {
      sample.push(weightedPick());
    }
    const mean = sample.reduce((sum, val) => sum + val, 0) / windowDays;
    sampleMeans.push(mean);
  }

  const averageDaily = salesValues.reduce((sum, val) => sum + val, 0) / windowDays;
  const variability = stdDev(salesValues);

  return {
    p50Daily: percentile(sampleMeans, 0.5),
    p90Daily: percentile(sampleMeans, 0.9),
    averageDaily,
    variability,
    windowDays,
  };
};
