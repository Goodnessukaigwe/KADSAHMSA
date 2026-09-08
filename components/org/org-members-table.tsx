"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { removeMember, setMemberRole } from "@/lib/org/actions";
import type { OrgMemberRow } from "@/lib/org/types";

export function OrgMembersTable({
  organisationId,
  members,
  allowManage = true,
}: {
  organisationId: string;
  members: OrgMemberRow[];
  allowManage?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const uniquePeople = useMemo(() => {
    const seen = new Map<string, OrgMemberRow[]>();
    for (const row of members) {
      const list = seen.get(row.userId) ?? [];
      list.push(row);
      seen.set(row.userId, list);
    }
    return [...seen.entries()];
  }, [members]);

  async function changeRole(userId: string, role: "member" | "admin") {
    if (pending) return;
    setPending(userId);
    setMessage(null);
    const result = await setMemberRole(organisationId, userId, role);
    setPending(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    router.refresh();
  }

  async function remove(userId: string) {
    if (pending) return;
    setPending(userId);
    setMessage(null);
    const result = await removeMember(organisationId, userId);
    setPending(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-[24px] bg-white">
      <div className="px-5 pt-5">
        <h2 className="text-lg font-bold">Staff</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Progress is live lessons completed. Quiz and certificate are per course.
        </p>
        {message ? (
          <p className="mt-3 text-sm text-neutral-500" role="alert">
            {message}
          </p>
        ) : null}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              <th className="px-5 py-3 font-bold">Name</th>
              <th className="px-2 py-3 font-bold">Email</th>
              <th className="px-2 py-3 font-bold">Role</th>
              <th className="px-2 py-3 font-bold">Course</th>
              <th className="px-2 py-3 font-bold">Progress</th>
              <th className="px-2 py-3 font-bold">Quiz</th>
              <th className="px-2 py-3 font-bold">Certificate</th>
              {allowManage ? (
                <th className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {uniquePeople.length === 0 ? (
              <tr>
                <td colSpan={allowManage ? 8 : 7} className="px-5 py-10 text-sm text-neutral-400">
                  No members yet.
                </td>
              </tr>
            ) : (
              uniquePeople.flatMap(([userId, rows]) =>
                rows.map((row, index) => (
                  <tr key={`${userId}-${row.courseSlug || "none"}-${index}`} className="border-b border-neutral-100 last:border-0">
                    <td className="px-5 py-4 font-medium">{index === 0 ? row.name : ""}</td>
                    <td className="px-2 py-4 text-neutral-500">{index === 0 ? row.email || "—" : ""}</td>
                    <td className="px-2 py-4 text-neutral-500">
                      {index === 0 ? (row.role === "admin" ? "Admin" : "Member") : ""}
                    </td>
                    <td className="px-2 py-4">{row.courseTitle}</td>
                    <td className="px-2 py-4 text-neutral-500">
                      {row.courseSlug ? progressLabel(row.completed, row.total) : "—"}
                    </td>
                    <td className="px-2 py-4">{outcome(row.quizResult)}</td>
                    <td className="px-2 py-4">{certLabel(row.certificate)}</td>
                    {allowManage ? (
                      <td className="px-5 py-4 text-right">
                        {index === 0 ? (
                          <div className="flex justify-end gap-2">
                            {row.role === "admin" ? (
                              <button
                                type="button"
                                disabled={pending !== null}
                                onClick={() => void changeRole(userId, "member")}
                                className="h-8 rounded-full bg-neutral-100 px-3 text-[10px] font-bold tracking-[0.12em] uppercase disabled:opacity-60"
                              >
                                Demote
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={pending !== null}
                                onClick={() => void changeRole(userId, "admin")}
                                className="h-8 rounded-full bg-neutral-100 px-3 text-[10px] font-bold tracking-[0.12em] uppercase disabled:opacity-60"
                              >
                                Promote
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={pending !== null}
                              onClick={() => void remove(userId)}
                              className="h-8 rounded-full bg-red-50 px-3 text-[10px] font-bold tracking-[0.12em] text-red-700 uppercase disabled:opacity-60"
                            >
                              Remove
                            </button>
                          </div>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function progressLabel(completed: number, total: number) {
  if (!total) return `${completed}/0`;
  if (completed >= total) return `Completed (${completed}/${total})`;
  return `${completed}/${total} lessons`;
}

export function outcome(value: "pass" | "fail" | "none") {
  if (value === "pass") return "Pass";
  if (value === "fail") return "Fail";
  return "—";
}

export function certLabel(value: "issued" | "revoked" | "none") {
  if (value === "issued") return "Issued";
  if (value === "revoked") return "Revoked";
  return "—";
}
