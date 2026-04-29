"use client";

import { useState, useEffect, useCallback } from "react";
import type { AnalysisJob } from "@kingsvarmo/shared";

const STORAGE_KEY = "kinsvarmo_job_history";

export function useJobHistory() {
  const [history, setHistory] = useState<AnalysisJob[]>([]);

  // Load on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.warn("Failed to read job history from local storage", err);
    }
  }, []);

  const addJobToHistory = useCallback((job: AnalysisJob) => {
    setHistory((prev) => {
      // Check if job already exists to avoid duplicates
      if (prev.some((p) => p.id === job.id)) {
        return prev;
      }
      
      const newHistory = [job, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      } catch (err) {
        console.warn("Failed to save job history to local storage", err);
      }
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn("Failed to clear job history", err);
    }
  }, []);

  return {
    history,
    addJobToHistory,
    clearHistory
  };
}
