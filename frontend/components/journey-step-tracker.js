"use client";
import { useEffect, useRef } from "react";
import { trackJourneyStep } from "../lib/visit-journey-client.js";

export default function JourneyStepTracker({ step }) {
  const previous = useRef(null);
  useEffect(() => {
    if (previous.current === step) return;
    previous.current = step;
    trackJourneyStep(step);
  }, [step]);
  return null;
}
