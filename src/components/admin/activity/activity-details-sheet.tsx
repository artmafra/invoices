"use client";

import { useTranslations } from "next-intl";
import type { ActivityEntry } from "@/types/common/activity.types";
import { generateSummary } from "@/lib/activity/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ActivityContent } from "./activity-content";

interface ActivityDetailsSheetProps {
  log: ActivityEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Activity Details Sheet Component - shows full overview in a slide-out panel
 * Order: Summary, Who/As, When, Affected, Values/Changes, Context (Session, Error/Reason, Metadata, Entry ID)
 */
export function ActivityDetailsSheet({ log, open, onOpenChange }: ActivityDetailsSheetProps) {
  const t = useTranslations("system.activity");
  const tCommon = useTranslations("common");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="">
        <SheetHeader>
          <SheetTitle>{generateSummary(log, t)}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto space-y-space-xl">
          <ActivityContent
            log={log}
            sections={{
              performer: true,
              when: true,
              affectedTarget: true,
              relatedTargets: true,
              values: true,
              changes: true,
              context: true,
              session: true,
              scope: true,
              action: true,
              identifier: true,
              reason: true,
              error: true,
              metadata: true,
              entryId: true,
            }}
          />
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">{tCommon("buttons.close")}</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
