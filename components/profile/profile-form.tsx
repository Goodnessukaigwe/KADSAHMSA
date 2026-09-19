"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SplitCta } from "@/components/landing/split-cta";
import { firstNameOf } from "@/lib/learner-session";
import { updateProfileName } from "@/lib/profile/actions";
import { AVATAR_ACCEPT, classifyAvatarUpload } from "@/lib/profile/media";
import { uploadAvatarFile } from "@/lib/profile/upload-avatar";

export function ProfileForm({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(name);
  const [photoUrl, setPhotoUrl] = useState(avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<"name" | "photo" | null>(null);

  const initial = firstNameOf(fullName || name || "Learner").charAt(0).toUpperCase();
  const canSave = fullName.trim().length >= 2 && fullName.trim() !== name.trim();

  async function onSaveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !canSave) return;
    setError(null);
    setSaved(false);
    setPending("name");
    try {
      const result = await updateProfileName(fullName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not save your name. Try again.");
    } finally {
      setPending(null);
    }
  }

  async function onPickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || pending) return;
    const classified = classifyAvatarUpload(file);
    if (!classified.ok) {
      setError(classified.error);
      setSaved(false);
      return;
    }
    setError(null);
    setSaved(false);
    setPending("photo");
    try {
      const result = await uploadAvatarFile(file);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPhotoUrl(result.avatarUrl);
      router.refresh();
    } catch {
      setError("Could not upload that photo. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Profile</h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-400">
        Your photo, name, and account.
      </p>

      <div className="mt-8 max-w-lg rounded-[28px] bg-white p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-28 items-center justify-center overflow-hidden rounded-full bg-neutral-950 text-3xl font-bold text-white">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="size-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={AVATAR_ACCEPT}
            className="sr-only"
            onChange={onPickPhoto}
          />
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => fileRef.current?.click()}
            className="mt-4 text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline disabled:opacity-50"
          >
            {pending === "photo" ? "Uploading…" : "Upload photo"}
          </button>
          <p className="mt-2 text-xs text-neutral-400">JPEG, PNG, or WebP. About 2 MB or smaller.</p>
        </div>

        <form onSubmit={onSaveName} className="mt-8 flex flex-col">
          <label className="text-[13px] text-neutral-500" htmlFor="profile-name">
            Name
          </label>
          <input
            id="profile-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              setSaved(false);
            }}
            className="mt-2 h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          />
          <p className="mt-3 truncate text-sm text-neutral-400" title={email}>
            {email}
          </p>

          {error ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="mt-4 text-sm text-neutral-600" role="status">
              Name saved.
            </p>
          ) : null}

          <div className="mt-6">
            <SplitCta type="submit" busy={pending === "name"} disabled={!canSave || pending !== null}>
              {pending === "name" ? "Saving…" : "Save"}
            </SplitCta>
          </div>
        </form>

        <Link
          href="/reset-password"
          className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-neutral-700 hover:text-neutral-950"
        >
          Change password
        </Link>
      </div>
    </div>
  );
}
