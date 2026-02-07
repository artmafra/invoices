"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionContext } from "@/contexts/session-context";
import { RotateCcw, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { getAvatarUrl } from "@/lib/avatar";
import { useUpdateProfile, useUserProfile } from "@/hooks/public/use-profile";
import { AdminHeader } from "@/components/admin/admin-header";
import { LazyAvatarUploadModal } from "@/components/admin/profile/lazy-profile-dialogs";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingButton } from "@/components/shared/loading-button";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Section, SectionContent, SectionHeader, SectionTitle } from "@/components/ui/section";
import { SidebarInset } from "@/components/ui/sidebar";

export function ProfilePageContent() {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const router = useRouter();
  const { session, update } = useSessionContext();
  const { data: user, isLoading: isUserLoading, error: userError } = useUserProfile();

  // Profile management hooks
  const updateProfileMutation = useUpdateProfile();

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Use session data for avatar, fallback to user data
  // Check if session.user.image is explicitly set (even if null) to handle optimistic removals
  const currentUserImage = session?.user?.image !== undefined ? session.user.image : user?.image;
  const currentUserName = session?.user?.name ?? user?.name;

  // Local state for individual fields
  const [pendingName, setPendingName] = useState(user?.name || "");
  const [pendingPhone, setPendingPhone] = useState(user?.phone || "");

  // Loading states for individual saves
  const [isNameLoading, setIsNameLoading] = useState(false);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);

  // Update local state when user data loads
  React.useEffect(() => {
    if (user) {
      setPendingName(user.name || "");
      setPendingPhone(user.phone || "");
    }
  }, [user]);

  // Dirty tracking
  const isNameDirty = pendingName !== (user?.name || "");
  const isPhoneDirty = pendingPhone !== (user?.phone || "");

  // Save handlers
  const handleNameSave = async () => {
    setIsNameLoading(true);
    try {
      await updateProfileMutation.mutateAsync({ name: pendingName || undefined });
      // Update the session with new name
      await update({ name: pendingName });
      router.refresh();
    } catch {
      // Error handled by mutation
    } finally {
      setIsNameLoading(false);
    }
  };

  const handlePhoneSave = async () => {
    setIsPhoneLoading(true);
    try {
      await updateProfileMutation.mutateAsync({ phone: pendingPhone || undefined });
      router.refresh();
    } catch {
      // Error handled by mutation
    } finally {
      setIsPhoneLoading(false);
    }
  };

  // Reset handlers
  const handleNameReset = () => setPendingName(user?.name || "");
  const handlePhoneReset = () => setPendingPhone(user?.phone || "");

  if (userError || (!isUserLoading && !user)) {
    return (
      <ErrorBoundary fallback={AdminErrorFallback}>
        <SidebarInset>
          <AdminHeader title={t("title")} />
          <PageContainer>
            <p className="text-center text-destructive">{t("errors.loadFailed")}</p>
          </PageContainer>
        </SidebarInset>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader title={t("title")} />
        <PageContainer>
          <PageDescription>{t("description")}</PageDescription>
          <LoadingTransition
            isLoading={isUserLoading}
            loadingMessage={tc("loading.profile")}
            animateOnMount
          >
            <LazyAvatarUploadModal
              isOpen={isAvatarModalOpen}
              onClose={() => setIsAvatarModalOpen(false)}
              currentImage={currentUserImage || null}
            />

            <Section>
              <SectionHeader>
                <SectionTitle>{t("information.title")}</SectionTitle>
              </SectionHeader>
              <SectionContent>
                {/* Profile Info Card (read-only display) */}
                <Card>
                  <CardContent>
                    <div className="flex flex-col items-center gap-space-lg sm:flex-row sm:items-center sm:gap-section">
                      <button
                        type="button"
                        onClick={() => setIsAvatarModalOpen(true)}
                        className="relative cursor-pointer"
                      >
                        {/* Shadow avatar (blurred duplicate) */}
                        {currentUserImage && (
                          <Avatar className="absolute h-24 w-24 blur-xl opacity-60 scale-85">
                            <AvatarImage
                              src={getAvatarUrl(currentUserImage, "lg")}
                              alt=""
                              aria-hidden="true"
                            />
                          </Avatar>
                        )}
                        <Avatar className="h-24 w-24 shrink-0">
                          <AvatarImage
                            src={getAvatarUrl(currentUserImage, "lg")}
                            alt={currentUserName || "User"}
                          />
                          <AvatarFallback>
                            <User className="h-10 w-10 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                      </button>
                      <div className="flex flex-col items-center gap-space-xs sm:items-start">
                        <div className="flex flex-wrap items-center justify-center gap-space-sm sm:justify-start">
                          <CardTitle>{currentUserName || t("information.noName")}</CardTitle>
                          {user?.roleName && <Badge variant="outline">{user.roleName}</Badge>}
                        </div>
                        <span className="text-sm text-muted-foreground">{user?.email}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Display Name Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("information.displayName")}</CardTitle>
                    <CardDescription>{t("information.displayNameDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      id="display-name-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleNameSave();
                      }}
                    >
                      <Input
                        value={pendingName}
                        onChange={(e) => setPendingName(e.target.value)}
                        placeholder={t("information.displayNamePlaceholder")}
                        className="w-full md:max-w-sm"
                      />
                    </form>
                  </CardContent>
                  <CardFooter className="justify-between">
                    <div className="flex-1" />
                    <div className="flex items-center gap-space-sm">
                      {isNameDirty && (
                        <Button type="button" variant="outline" onClick={handleNameReset}>
                          <RotateCcw className="h-4 w-4" />
                          {tc("buttons.reset")}
                        </Button>
                      )}
                      <LoadingButton
                        type="submit"
                        form="display-name-form"
                        loading={isNameLoading}
                        loadingText={tc("loading.saving")}
                        disabled={!isNameDirty}
                      >
                        {tc("buttons.save")}
                      </LoadingButton>
                    </div>
                  </CardFooter>
                </Card>

                {/* Phone Number Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("information.phoneNumber")}</CardTitle>
                    <CardDescription>{t("information.phoneNumberDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      id="phone-number-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handlePhoneSave();
                      }}
                    >
                      <PhoneInput
                        value={pendingPhone}
                        onChange={(value) => setPendingPhone(value)}
                        placeholder={t("information.phoneNumberPlaceholder")}
                        defaultCountry="US"
                        className="w-full md:max-w-sm"
                      />
                    </form>
                  </CardContent>
                  <CardFooter className="justify-between">
                    <div className="flex-1" />
                    <div className="flex items-center gap-space-sm">
                      {isPhoneDirty && (
                        <Button type="button" variant="outline" onClick={handlePhoneReset}>
                          <RotateCcw className="h-4 w-4" />
                          {tc("buttons.reset")}
                        </Button>
                      )}
                      <LoadingButton
                        type="submit"
                        form="phone-number-form"
                        loading={isPhoneLoading}
                        loadingText={tc("loading.saving")}
                        disabled={!isPhoneDirty}
                      >
                        {tc("buttons.save")}
                      </LoadingButton>
                    </div>
                  </CardFooter>
                </Card>
              </SectionContent>
            </Section>
          </LoadingTransition>
        </PageContainer>
      </SidebarInset>
    </ErrorBoundary>
  );
}
