"use client";

import { Archive, ArchiveRestore, Edit, MoreHorizontal, Pin, PinOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import type { NoteWithCreator } from "@/hooks/admin/use-notes";
import { useDateFormat } from "@/hooks/use-date-format";
import { LazyMarkdown } from "@/components/shared/lazy-markdown";
import { UserHoverCard } from "@/components/shared/user-hover-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteCardProps {
  note: NoteWithCreator;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
  onArchive?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  isArchived?: boolean;
}

export function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onArchive,
  canEdit = true,
  canDelete = true,
  isArchived = false,
}: NoteCardProps) {
  const t = useTranslations("apps/notes");
  const { formatDate } = useDateFormat();

  const showDropdown = (canEdit && (onEdit || onTogglePin || onArchive)) || (canDelete && onDelete);

  return (
    <Card className="transition-shadow hover:shadow-md gap-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            {note.color && (
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: note.color }}
                aria-label="Note color"
              />
            )}
            <CardTitle>{note.title}</CardTitle>
          </div>

          <div className="flex items-center gap-space-xs">
            {note.isPinned && <Pin className="h-4 w-4" />}
            {showDropdown && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="h-4 w-4" />
                      {t("actions.edit")}
                    </DropdownMenuItem>
                  )}
                  {canEdit && onTogglePin && !isArchived && (
                    <DropdownMenuItem onClick={onTogglePin}>
                      {note.isPinned ? (
                        <>
                          <PinOff className="h-4 w-4" />
                          {t("actions.unpin")}
                        </>
                      ) : (
                        <>
                          <Pin className="h-4 w-4" />
                          {t("actions.pin")}
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  {canEdit && onArchive && (
                    <>
                      {!isArchived && onTogglePin && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={onArchive}>
                        {isArchived ? (
                          <>
                            <ArchiveRestore className="h-4 w-4" />
                            {t("actions.unarchive")}
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4" />
                            {t("actions.archive")}
                          </>
                        )}
                      </DropdownMenuItem>
                    </>
                  )}
                  {canDelete && onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onDelete} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                        {t("actions.delete")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-space-lg">
        <div className="prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <LazyMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>{note.content}</LazyMarkdown>
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground flex flex-col items-start md:flex-row md:justify-between md:items-center gap-space-md">
        <div className="flex gap-space-sm">
          {note.createdBy ? (
            <UserHoverCard userId={note.createdBy.id}>
              <span className="cursor-pointer hover:underline">
                {note.createdBy.name || note.createdBy.email}
              </span>
            </UserHoverCard>
          ) : (
            <span>Unknown</span>
          )}
          <span>{"•"}</span>
          <span>{formatDate(note.createdAt)}</span>
        </div>
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-space-xs">
            {note.tags.map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
