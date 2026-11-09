import { useState, useEffect, useCallback } from "react";
import {
  OrderPipelinePreferences,
  OrderSortDirection,
  OrderAgeCriteria,
  OrderPipelineItem,
} from "@/types/orderPipeline";

const PREFS_STORAGE_KEY = "lojafy_order_pipeline_preferences_v1";

const DEFAULT_PREFERENCES: OrderPipelinePreferences = {
  sort_direction: "newest_first", // Mais recentes primeiro por padrão
  age_criteria: "created_at", // Data de criação
  default_view: "pipeline",
};

export const useOrderPreferences = () => {
  const [preferences, setPreferences] = useState<OrderPipelinePreferences>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const updatePreferences = useCallback((newPrefs: Partial<OrderPipelinePreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...newPrefs };
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  /**
   * Sorts orders based on active preferences.
   * By default: oldest first (`ORDER BY created_at ASC, id ASC`).
   */
  const sortOrders = useCallback(
    (items: OrderPipelineItem[]): OrderPipelineItem[] => {
      const copy = [...items];
      const { sort_direction, age_criteria } = preferences;

      return copy.sort((a, b) => {
        const dateAStr = age_criteria === "stage_entered_at" ? a.stage_entered_at || a.created_at : a.created_at;
        const dateBStr = age_criteria === "stage_entered_at" ? b.stage_entered_at || b.created_at : b.created_at;

        const timeA = new Date(dateAStr).getTime() || 0;
        const timeB = new Date(dateBStr).getTime() || 0;

        switch (sort_direction) {
          case "oldest_first":
            // Mais antigos primeiro (crescente)
            if (timeA !== timeB) return timeA - timeB;
            return a.order_number.localeCompare(b.order_number);

          case "newest_first":
            // Mais recentes primeiro (decrescente)
            if (timeA !== timeB) return timeB - timeA;
            return b.order_number.localeCompare(a.order_number);

          case "longest_time_in_stage": {
            // Maior tempo na etapa primeiro
            const stageA = new Date(a.stage_entered_at || a.created_at).getTime() || 0;
            const stageB = new Date(b.stage_entered_at || b.created_at).getTime() || 0;
            return stageA - stageB; // Smaller timestamp = entered earlier = longest time in stage
          }

          case "shortest_time_in_stage": {
            // Menor tempo na etapa primeiro
            const stageA = new Date(a.stage_entered_at || a.created_at).getTime() || 0;
            const stageB = new Date(b.stage_entered_at || b.created_at).getTime() || 0;
            return stageB - stageA;
          }

          default:
            return timeA - timeB;
        }
      });
    },
    [preferences]
  );

  return {
    preferences,
    updatePreferences,
    sortOrders,
  };
};
