import { describe, expect, it } from "vitest";

import { buildDailySeries, forecastDemand } from "@/server/services/forecasting";
import { addDays, startOfDay, subDays } from "@/server/services/time";

describe("forecasting", () => {
  it("builds a complete daily series with zeros", () => {
    const today = startOfDay(new Date());
    const sales = [
      { date: subDays(today, 2), qty: 5 },
      { date: subDays(today, 1), qty: 3 },
    ];

    const series = buildDailySeries(sales, 4);
    expect(series).toHaveLength(4);
    expect(series[0].qty).toBe(0);
    expect(series[1].qty).toBe(5);
    expect(series[2].qty).toBe(3);
    expect(series[3].qty).toBe(0);
  });

  it("produces stable bootstrap percentiles", () => {
    const start = startOfDay(new Date());
    const sales = Array.from({ length: 14 }, (_, index) => ({
      date: addDays(start, index),
      qty: 4,
    }));

    const forecast = forecastDemand({
      dailySales: sales,
      horizonDays: 14,
      windowDays: 14,
      samples: 200,
      seed: 123,
    });

    expect(forecast.p50Daily).toBeGreaterThan(3);
    expect(forecast.p90Daily).toBeGreaterThanOrEqual(forecast.p50Daily);
    expect(forecast.averageDaily).toBeCloseTo(4, 1);
  });
});
