"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SettingKey } from "@/config/settings.registry";
import {
  useUpdateSetting,
  useUploadSettingImage,
  type AdminSetting as Setting,
} from "@/hooks/admin/use-admin-settings";
import { useImagePreview } from "@/hooks/shared/use-image-preview";
import { useImageUpload } from "@/hooks/shared/use-image-upload";
import {
  BooleanSetting,
  ImageSetting,
  NumberSetting,
  SelectSetting,
  TextSetting,
} from "@/components/admin/settings";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SettingType = "string" | "boolean" | "number" | "json" | "image" | "select";

interface SettingDisplayProps {
  type: string;
  value: string;
  settingKey: string;
  imageSize?: number;
}

function SettingDisplay({ type, value, settingKey, imageSize = 200 }: SettingDisplayProps) {
  if (type === "image" && value) {
    return (
      <div
        className="relative overflow-hidden rounded"
        style={{ width: imageSize, height: imageSize }}
      >
        <Image
          src={value}
          alt={settingKey}
          fill
          sizes={`${imageSize}px`}
          className="object-cover"
        />
      </div>
    );
  }

  if (type === "boolean") {
    return (
      <div className="flex items-center gap-space-sm">
        <code className="text-xs bg-muted p-space-sm rounded block max-w-md overflow-hidden">
          {value === "true" ? "Enabled" : "Disabled"}
        </code>
      </div>
    );
  }

  // Default text display
  return (
    <code className="text-xs bg-muted p-space-sm rounded block max-w-md max-h-36 overflow-auto break-all">
      {value || "(empty)"}
    </code>
  );
}

interface SettingEditorProps {
  settingId: string;
  settingKey: string;
  type: string;
  value: string;
  options?: string[] | null;
  booleanValue: boolean;
  onValueChange: (value: string) => void;
  onBooleanValueChange: (value: boolean) => void;
  // Image setting props
  previewUrl?: string | null;
  isImageRemoved?: boolean;
  onImageFileSelect?: (file: File | null) => void;
  onImageRemove?: () => void;
}

function SettingEditor({
  settingId,
  settingKey,
  type,
  value,
  options,
  booleanValue,
  onValueChange,
  onBooleanValueChange,
  previewUrl,
  isImageRemoved,
  onImageFileSelect,
  onImageRemove,
}: SettingEditorProps) {
  switch (type) {
    case "image":
      return (
        <ImageSetting
          settingId={settingId}
          _settingKey={settingKey}
          currentValue={value}
          onChange={onValueChange}
          previewUrl={previewUrl ?? null}
          isRemoved={isImageRemoved ?? false}
          onFileSelect={onImageFileSelect ?? (() => {})}
          onRemove={onImageRemove ?? (() => {})}
        />
      );

    case "boolean":
      return (
        <BooleanSetting
          settingId={settingId}
          value={booleanValue}
          onChange={onBooleanValueChange}
        />
      );

    case "select":
      return (
        <SelectSetting
          settingId={settingId}
          value={value}
          options={options || []}
          onChange={onValueChange}
        />
      );

    case "number":
      return <NumberSetting settingId={settingId} value={value} onChange={onValueChange} />;

    default:
      return (
        <TextSetting settingId={settingId} value={value} onChange={onValueChange} type={type} />
      );
  }
}

// Helper to parse options from JSON string
const parseOptions = (options: string | null): string[] | null => {
  if (!options) return null;
  try {
    const parsed = JSON.parse(options);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

interface SettingCardProps {
  setting: Setting;
  canEdit: boolean;
}

export function SettingCard({ setting, canEdit }: SettingCardProps) {
  const tc = useTranslations("common");

  // Local state for this setting's value
  const [editingValue, setEditingValue] = useState(setting.value);
  const [editingBooleanValue, setEditingBooleanValue] = useState(setting.value === "true");
  const [error, setError] = useState<string | null>(null);

  // Image upload hooks (lifted from ImageSetting)
  const imageUpload = useImageUpload();
  const preview = useImagePreview();

  const updateSettingMutation = useUpdateSetting();
  const uploadImageMutation = useUploadSettingImage();

  // Reset image hooks when setting changes or component mounts
  useEffect(() => {
    imageUpload.reset();
    preview.updateFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setting.id]);

  // Sync local state when setting value changes (e.g., after save)
  useEffect(() => {
    setEditingValue(setting.value);
    setEditingBooleanValue(setting.value === "true");
  }, [setting.value]);

  // Check if value has changed from original
  const getCurrentValue = (): string => {
    switch (setting.type) {
      case "boolean":
        return editingBooleanValue.toString();
      case "image":
        return editingValue;
      default:
        return editingValue;
    }
  };

  const isDirty = getCurrentValue() !== setting.value || imageUpload.hasChanges;

  const handleReset = () => {
    setEditingValue(setting.value);
    setEditingBooleanValue(setting.value === "true");
    imageUpload.reset();
    preview.updateFile(null);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);

    try {
      let valueToSave = getCurrentValue();

      // Handle image settings
      if (setting.type === "image") {
        if (imageUpload.isRemoved && setting.value) {
          // Remove image by setting value to empty string
          valueToSave = "";
        } else if (imageUpload.selectedFile) {
          // Upload new image first, then use returned URL
          const uploadResult = await uploadImageMutation.mutateAsync({
            file: imageUpload.selectedFile,
            settingId: setting.id,
            settingKey: setting.key as SettingKey,
          });
          valueToSave = uploadResult.url;
        }
      }

      // Save setting with new value
      await updateSettingMutation.mutateAsync({
        key: setting.key as SettingKey,
        label: setting.label,
        type: setting.type as SettingType,
        description: setting.description,
        category: setting.category,
        scope: setting.scope,
        value: valueToSave,
      });

      // Reset image state after successful save
      imageUpload.reset();
      preview.updateFile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save setting";
      setError(message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDirty) {
      handleSave();
    }
  };

  // Single loading flag for all operations
  const isSaving = updateSettingMutation.isPending || uploadImageMutation.isPending;

  // Unique form ID per setting to avoid conflicts
  const formId = `setting-form-${setting.id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{setting.label}</CardTitle>
        <CardDescription>{setting.description}</CardDescription>
      </CardHeader>
      {canEdit ? (
        <>
          <CardContent>
            <form id={formId} onSubmit={handleSubmit}>
              <SettingEditor
                settingId={setting.id}
                settingKey={setting.key}
                type={setting.type}
                value={editingValue}
                options={parseOptions(setting.options)}
                booleanValue={editingBooleanValue}
                onValueChange={setEditingValue}
                onBooleanValueChange={setEditingBooleanValue}
                previewUrl={preview.previewUrl}
                isImageRemoved={imageUpload.isRemoved}
                onImageFileSelect={(file) => {
                  if (file) {
                    preview.updateFile(file);
                    imageUpload.handleFileSelect(file);
                  }
                }}
                onImageRemove={() => {
                  imageUpload.handleRemove();
                  setEditingValue("");
                }}
              />
            </form>
          </CardContent>
          <CardFooter className="justify-between">
            {/* Error message on the left */}
            <div>{error && <p className="text-sm text-destructive">{error}</p>}</div>
            {/* Buttons on the right */}
            <div className="flex items-center gap-space-sm">
              {isDirty && (
                <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving}>
                  <RotateCcw className="h-4 w-4" />
                  {tc("buttons.reset")}
                </Button>
              )}
              <LoadingButton
                type="submit"
                form={formId}
                loading={isSaving}
                loadingText={tc("loading.saving")}
                disabled={!isDirty || isSaving}
              >
                {tc("buttons.save")}
              </LoadingButton>
            </div>
          </CardFooter>
        </>
      ) : (
        <CardContent>
          <SettingDisplay
            type={setting.type}
            value={setting.value}
            settingKey={setting.key}
            imageSize={200}
          />
        </CardContent>
      )}
    </Card>
  );
}
