"use client";

import { Button } from "@/components/ui/Button";

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-pine-deep/50 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
      >
        <h2 id="confirm-title" className="text-xl font-extrabold text-pine">
          {title}
        </h2>
        <p className="mt-2 text-base leading-6 text-muted">{body}</p>
        <div className="mt-5 grid gap-2">
          {danger ? (
            <>
              <Button variant="secondary" full onClick={onCancel} autoFocus>
                Cancel
              </Button>
              <Button variant="danger" full onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </>
          ) : (
            <>
              <Button full onClick={onConfirm} autoFocus>
                {confirmLabel}
              </Button>
              <Button variant="secondary" full onClick={onCancel}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
