import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UniversityLogo } from "@/components/UniversityLogo";
import { matchUniversity } from "@/data/universities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  Loader2,
  Pencil,
  Upload,
  X,
} from "lucide-react";

/**
 * Admin review queue for imported EC Database pathway items. All actions go
 * through the server; S3 artifacts open via temporary presigned URLs.
 */

type AdminActivity = {
  SK: string;
  entityType: "activity";
  title: string;
  description: string;
  stemField: string;
  experienceType: string;
  reviewStatus: string;
  published: boolean;
};

type AdminAward = {
  SK: string;
  entityType: "award";
  name: string;
  category: string;
  reviewStatus: string;
  published: boolean;
};

type AdminPathway = {
  profile: {
    profileId: string;
    anonymousLabel?: string;
    sourceUrl: string;
    acceptedSchools?: string[];
    intendedMajors?: string[];
  };
  activities: AdminActivity[];
  awards: AdminAward[];
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }
  return response.json();
}

function StatusBadge({
  item,
}: {
  item: { reviewStatus: string; published: boolean };
}) {
  if (item.published)
    return <Badge className="bg-emerald-600">published</Badge>;
  if (item.reviewStatus === "approved")
    return <Badge className="bg-sky-600">approved</Badge>;
  if (item.reviewStatus === "rejected")
    return <Badge variant="destructive">rejected</Badge>;
  return <Badge variant="secondary">pending</Badge>;
}

export default function AdminPathways() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data, isLoading, error } = useQuery<AdminPathway[]>({
    queryKey: ["admin-pathways"],
    queryFn: () => api("/api/admin/pathways"),
  });

  const review = useMutation({
    mutationFn: (body: {
      profileId: string;
      sk: string;
      action: string;
      edits?: Record<string, unknown>;
    }) =>
      api("/api/admin/pathways/review", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pathways"] });
      setEditing(null);
    },
  });

  async function openArtifact(profileId: string, type: "raw" | "extracted") {
    const { url } = await api<{ url: string }>(
      `/api/admin/pathways/${profileId}/artifact?type=${type}`,
    );
    window.open(url, "_blank", "noopener");
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Pathway review</h1>
          <p className="text-sm text-muted-foreground">
            Approve, edit, or reject imported EC Database items before
            publishing.
          </p>
        </div>

        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        )}
        {error != null && (
          <p className="text-sm text-destructive">
            {(error as Error).message} — are you logged in as admin?
          </p>
        )}

        {data?.map(({ profile, activities, awards }) => (
          <section
            key={profile.profileId}
            className="rounded-xl border bg-card p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-medium">
                  {profile.anonymousLabel || profile.profileId}
                </h2>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {(profile.acceptedSchools ?? []).map((school) => {
                    const uni = matchUniversity(school);
                    return (
                      <span
                        key={school}
                        className="inline-flex items-center gap-1"
                      >
                        {uni && <UniversityLogo university={uni} size={14} />}
                        {uni?.shortName ?? school}
                      </span>
                    );
                  })}
                  <span>· {(profile.intendedMajors ?? []).join(", ")}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={profile.sourceUrl} target="_blank" rel="noreferrer">
                    Original profile <ArrowUpRight className="ml-1 h-3 w-3" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void openArtifact(profile.profileId, "raw")}
                >
                  Raw S3 <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void openArtifact(profile.profileId, "extracted")
                  }
                >
                  Extracted S3 <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>

            <ul className="space-y-2">
              {[...activities, ...awards].map((item) => {
                const isActivity = item.entityType === "activity";
                const label = isActivity
                  ? (item as AdminActivity).title
                  : (item as AdminAward).name;
                const key = `${profile.profileId}|${item.SK}`;
                const isEditing = editing === key;
                return (
                  <li key={item.SK} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge item={item} />
                        <span className="text-sm font-medium">{label}</span>
                        {isActivity && (
                          <span className="text-xs text-muted-foreground">
                            {(item as AdminActivity).stemField} ·{" "}
                            {(item as AdminActivity).experienceType}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={review.isPending}
                          onClick={() =>
                            review.mutate({
                              profileId: profile.profileId,
                              sk: item.SK,
                              action: "approve",
                            })
                          }
                        >
                          <Check className="mr-1 h-3 w-3" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={review.isPending}
                          onClick={() =>
                            review.mutate({
                              profileId: profile.profileId,
                              sk: item.SK,
                              action: "reject",
                            })
                          }
                        >
                          <X className="mr-1 h-3 w-3" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={review.isPending}
                          onClick={() =>
                            review.mutate({
                              profileId: profile.profileId,
                              sk: item.SK,
                              action: item.published ? "unpublish" : "publish",
                            })
                          }
                        >
                          <Upload className="mr-1 h-3 w-3" />
                          {item.published ? "Unpublish" : "Publish"}
                        </Button>
                        {isActivity && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(isEditing ? null : key);
                              setEditTitle((item as AdminActivity).title);
                              setEditDescription(
                                (item as AdminActivity).description,
                              );
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {isActivity && !isEditing && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(item as AdminActivity).description}
                      </p>
                    )}
                    {isEditing && (
                      <div className="mt-2 space-y-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title"
                        />
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={review.isPending}
                            onClick={() =>
                              review.mutate({
                                profileId: profile.profileId,
                                sk: item.SK,
                                action: "edit",
                                edits: {
                                  title: editTitle,
                                  description: editDescription,
                                },
                              })
                            }
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </AdminLayout>
  );
}
