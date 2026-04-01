"use client";

import { useState, useTransition } from "react";

type CopyButtonProps = {
  value: string;
  label: string;
};

export function CopyButton({ value, label }: CopyButtonProps) {
  const [feedback, setFeedback] = useState(label);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="button-secondary justify-center"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await navigator.clipboard.writeText(value);
          setFeedback("Copiado");
          window.setTimeout(() => setFeedback(label), 1200);
        });
      }}
      type="button"
    >
      {feedback}
    </button>
  );
}
