"use client";

import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../../../db/convex/_generated/api";

const DEBOUNCE_MS = 650;
const UI_TIMEOUT_MS = 8_500;
const MIN_DRAFT_LENGTH = 20;

export function useEmailSuggestion({
  subject,
  body,
  contextKey,
  enabled,
}: {
  subject: string;
  body: string;
  contextKey: string;
  enabled: boolean;
}) {
  const generate = useAction(api.ai.generateEmailSuggestion);
  const [suggestionResult, setSuggestionResult] = useState<{ key: string; suggestion: string } | null>(null);
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const key = JSON.stringify([contextKey, subject, body, enabled]);

  useEffect(() => {
    requestIdRef.current += 1;
    const effectId = requestIdRef.current;

    if (!enabled || body.trim().length < MIN_DRAFT_LENGTH || dismissedKey === key) {
      return () => { requestIdRef.current += 1; };
    }

    let requestId: number | null = null;
    let requestTimer: number | undefined;
    const debounceTimer = window.setTimeout(() => {
      requestId = ++requestIdRef.current;
      const activeRequestId = requestId;
      setGeneratingKey(key);
      setErrorKey(null);
      console.info("[smart-compose] request_dispatched", {
        requestId: activeRequestId,
        subjectLength: subject.trim().length,
        bodyLength: body.length,
      });
      requestTimer = window.setTimeout(() => {
        if (requestIdRef.current === activeRequestId) {
          requestIdRef.current += 1;
          setGeneratingKey(null);
        }
      }, UI_TIMEOUT_MS);

      void generate({ subject, body }).then(({ suggestion }) => {
        console.info("[smart-compose] request_completed", {
          requestId: activeRequestId,
          suggestionLength: suggestion.length,
          receivedSuggestion: suggestion.length > 0,
        });
        if (requestIdRef.current === activeRequestId && suggestion) {
          setSuggestionResult({ key, suggestion });
        }
      }).catch((error: unknown) => {
        console.error("[smart-compose] request_failed", {
          requestId: activeRequestId,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        // AI is optional: leave compose usable and suppress provider errors.
        if (requestIdRef.current === activeRequestId) setErrorKey(key);
      }).finally(() => {
        if (requestIdRef.current === activeRequestId) setGeneratingKey(null);
        if (requestTimer !== undefined) window.clearTimeout(requestTimer);
      });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(debounceTimer);
      if (requestTimer !== undefined) window.clearTimeout(requestTimer);
      if (requestId === null && requestIdRef.current === effectId) requestIdRef.current += 1;
      else if (requestId !== null && requestIdRef.current === requestId) requestIdRef.current += 1;
    };
  }, [body, dismissedKey, enabled, generate, key, subject]);

  const dismiss = useCallback(() => {
    setDismissedKey(key);
    requestIdRef.current += 1;
    setSuggestionResult(null);
    setGeneratingKey(null);
    setErrorKey(null);
  }, [key]);

  const clearDismissal = useCallback(() => setDismissedKey(null), []);

  return {
    suggestion: enabled && suggestionResult?.key === key ? suggestionResult.suggestion : "",
    isGeneratingSuggestion: enabled && generatingKey === key,
    unavailable: enabled && errorKey === key,
    waitingForDraft: enabled && body.trim().length < MIN_DRAFT_LENGTH,
    dismiss,
    clearDismissal,
  };
}
