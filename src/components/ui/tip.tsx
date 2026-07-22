"use client";

import * as Tooltip from "@radix-ui/react-tooltip";

export function TipProvider({ children }: { children: React.ReactNode }) {
  // delayDuration keeps tips from popping instantly; disableHoverableContent
  // means the tip never sits between the cursor and the trigger, so it can't
  // swallow the button's click.
  return (
    <Tooltip.Provider delayDuration={250} skipDelayDuration={120} disableHoverableContent>
      {children}
    </Tooltip.Provider>
  );
}

export function Tip({
  label,
  side = "top",
  children,
}: {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="tip"
          side={side}
          sideOffset={6}
          // Never capture pointer events — clicks pass straight to the button.
          style={{ pointerEvents: "none" }}
        >
          {label}
          <Tooltip.Arrow className="tip-arrow" width={10} height={5} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
