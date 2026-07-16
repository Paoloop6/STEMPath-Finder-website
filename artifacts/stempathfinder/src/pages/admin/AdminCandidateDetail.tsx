import { useState } from "react";
import { useLocation, useParams, Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  useGetCandidate, 
  useUpdateCandidateStatus,
  getGetCandidateQueryKey,
  getListCandidatesQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Copy, ExternalLink, Info } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminCandidateDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = parseInt(params.id!, 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState("");

  const { data: candidate, isLoading } = useGetCandidate(id, {
    query: {
      enabled: !!id,
      queryKey: getGetCandidateQueryKey(id)
    }
  });

  const updateMutation = useUpdateCandidateStatus();

  // Initialize notes once loaded
  useState(() => {
    if (candidate?.reviewNotes) {
      setNotes(candidate.reviewNotes);
    }
  });

  const handleAction = (status: 'approved' | 'rejected' | 'duplicate') => {
    updateMutation.mutate(
      { id, data: { reviewStatus: status, reviewNotes: notes } },
      {
        onSuccess: () => {
          let message = "Candidate updated";
          if (status === 'approved') message = "Candidate approved and imported as unpublished Opportunity.";
          if (status === 'rejected') message = "Candidate rejected.";
          if (status === 'duplicate') message = "Candidate marked as duplicate.";

          toast({ title: message });
          queryClient.invalidateQueries({ queryKey: getListCandidatesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetCandidateQueryKey(id) });
          
          if (status === 'approved') {
            // Once approved, redirect to opportunity list or the new opp (backend handles creation)
            // Backend copies to opportunities as unpublished. We can redirect to opps.
            setLocation("/admin/opportunities");
          } else {
            setLocation("/admin/candidates");
          }
        }
      }
    );
  };

  if (isLoading || !candidate) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => setLocation("/admin/candidates")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-foreground">Review Candidate</h1>
            <StatusBadge status={candidate.reviewStatus} />
          </div>
          <p className="text-muted-foreground mt-1">Discovered: {new Date(candidate.dateDiscovered).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader className="bg-muted/20 border-b border-border">
              <CardTitle className="font-serif">Extracted Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                <div className="md:col-span-2">
                  <dt className="text-muted-foreground font-medium mb-1">Name</dt>
                  <dd className="font-semibold text-lg">{candidate.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">Organization</dt>
                  <dd>{candidate.organization}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">Official URL</dt>
                  <dd>
                    <a href={candidate.officialUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">
                      {candidate.officialUrl} <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </dd>
                </div>
                
                <div className="md:col-span-2 border-t border-border pt-4 mt-2"></div>
                
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">Category & Field</dt>
                  <dd>{candidate.category} &bull; {candidate.stemField}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">Format & Location</dt>
                  <dd>{candidate.format} &bull; {candidate.location}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">Target Grades</dt>
                  <dd>{candidate.possibleGrades}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">Target Ages</dt>
                  <dd>{candidate.possibleAges}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">Cost Indication</dt>
                  <dd>{candidate.possibleCost}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">Deadline Mentioned</dt>
                  <dd>{candidate.possibleDeadline || "None detected"}</dd>
                </div>

                <div className="md:col-span-2 border-t border-border pt-4 mt-2"></div>

                <div className="md:col-span-2">
                  <dt className="text-muted-foreground font-medium mb-1">Summary</dt>
                  <dd className="whitespace-pre-wrap">{candidate.summary}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-muted-foreground font-medium mb-1">Requirements</dt>
                  <dd className="whitespace-pre-wrap">{candidate.requirements}</dd>
                </div>
                
                {candidate.sourceUrls && (
                  <div className="md:col-span-2">
                    <dt className="text-muted-foreground font-medium mb-1">Sources</dt>
                    <dd className="break-all text-xs text-muted-foreground">{candidate.sourceUrls}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border sticky top-6">
            <CardHeader className="bg-muted/20 border-b border-border">
              <CardTitle className="font-serif">Review Action</CardTitle>
              <CardDescription>Approve this to create a new unpublished opportunity.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <Alert className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-sm font-semibold text-primary">What happens when approved?</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-1">
                  The system will copy this data into a real Opportunity record, mark it as unpublished, and set its verification to 'needs_verification'. You can then edit it before publishing.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium">Review Notes (Optional)</label>
                <Textarea 
                  placeholder="Notes about verification, missing info, etc." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {candidate.reviewStatus === 'needs_verification' && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                    onClick={() => handleAction('approved')}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Approve & Import
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-amber-700 border-amber-200 hover:bg-amber-50" 
                    onClick={() => handleAction('duplicate')}
                    disabled={updateMutation.isPending}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Mark as Duplicate
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 border-red-200 hover:bg-red-50" 
                    onClick={() => handleAction('rejected')}
                    disabled={updateMutation.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject (Spam/Irrelevant)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'needs_verification') return <Badge className="bg-amber-100 text-amber-800 border-none">Needs Review</Badge>;
  if (status === 'approved') return <Badge className="bg-emerald-100 text-emerald-800 border-none">Approved</Badge>;
  if (status === 'rejected') return <Badge className="bg-red-100 text-red-800 border-none">Rejected</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-none">Duplicate</Badge>;
}
