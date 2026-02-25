import { ProfileClient } from "@/app/[locale]/profile/profile-client";

export default async function ProfilePage() {
  return (
    <div className="grid gap-4">
      <ProfileClient />
    </div>
  );
}
