import Image from "next/image";
import { Edit, ExternalLink, Gamepad2, MoreHorizontal, Trash2 } from "lucide-react";
import type { useTranslations } from "next-intl";
import type { GameWithCreator } from "@/hooks/admin/use-games";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StarRating } from "./star-rating";

export interface GameCardProps {
  game: GameWithCreator;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
  t: ReturnType<typeof useTranslations<"apps/games">>;
}

/**
 * Game card component displaying game information
 * Used in the games list view
 */
export function GameCard({ game, onEdit, onDelete, canEdit, canDelete, t }: GameCardProps) {
  const showDropdown = canEdit || canDelete;

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardContent className="flex flex-row gap-space-lg">
        {/* Cover Image - Fixed aspect ratio 177:265 */}
        <div className="w-16.25">
          {game.coverImage ? (
            <Image
              src={game.coverImage}
              alt={game.name}
              width={65}
              height={115}
              className="rounded-md object-cover border"
            />
          ) : (
            <div className="flex h-28.75 w-16.25 items-center justify-center rounded-md bg-muted">
              <Gamepad2 className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Header with title and dropdown */}
          <div className="flex items-center justify-between gap-space-sm">
            <CardTitle>{game.name}</CardTitle>
            {showDropdown && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                      {t("actions.delete")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Status Info */}
          <div className="text-sm text-muted-foreground">
            <p>
              {t("fields.played")}: {game.played ? t("status.yes") : t("status.no")}
            </p>
            <p>
              {t("fields.tried")}: {game.tried ? t("status.yes") : t("status.no")}
            </p>
            <p>
              {t("fields.multiplayer")}:{" "}
              {game.multiplayerFunctional ? t("status.functional") : t("status.nonFunctional")}{" "}
            </p>
          </div>

          {/* Drop Reason or Notes */}
          {game.dropReason && (
            <p className="mt-space-sm text-sm text-destructive line-clamp-2">
              <span className="font-medium">{t("fields.dropReason")}:</span> {game.dropReason}
            </p>
          )}
          {game.notes && !game.dropReason && (
            <p className="mt-space-sm text-sm text-muted-foreground line-clamp-2">{game.notes}</p>
          )}
        </div>
      </CardContent>

      {/* Footer Actions - Full width */}
      <CardFooter className="flex items-center justify-between border-t pt-space-md">
        <StarRating rating={game.rating} readonly size="sm" />
        <div className="flex items-center gap-space-sm">
          {game.xboxStoreLink && (
            <Button variant="ghost" size="sm" asChild>
              <a href={game.xboxStoreLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                {t("actions.xboxStore")}
              </a>
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
              {t("actions.edit")}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
