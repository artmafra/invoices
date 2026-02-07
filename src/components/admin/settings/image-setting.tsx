"use client";

import { ImageUploader } from "@/components/shared/image-uploader";

interface ImageSettingProps {
  settingId: string;
  _settingKey: string;
  currentValue: string;
  onChange: (value: string) => void;
  previewUrl: string | null;
  isRemoved: boolean;
  onFileSelect: (file: File | null) => void;
  onRemove: () => void;
}

export function ImageSetting({
  settingId: _settingId,
  _settingKey,
  currentValue,
  onChange: _onChange,
  previewUrl,
  isRemoved,
  onFileSelect,
  onRemove,
}: ImageSettingProps) {
  // Determine display value: if removed, show null; otherwise show preview or current value
  const displayValue = isRemoved ? null : previewUrl || currentValue;

  return (
    <div className="mt-space-sm">
      <ImageUploader
        value={displayValue}
        onFileSelect={onFileSelect}
        onRemove={onRemove}
        maxSizeBytes={5 * 1024 * 1024}
        previewSize={150}
      />
    </div>
  );
}
