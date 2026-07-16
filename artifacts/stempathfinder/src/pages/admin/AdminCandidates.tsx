import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  useListCandidates, 
  getListCandidatesQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Inbox, Loader2 } from "lucide-react";

export default function AdminCandidates() {
  const [statusFilter, setStatusFilter] = useState<string>("needs_verification");

  const { data: candidates, isLoading } = useListCandidates({
    status: statusFilter !== "all" ? statusFilter : undefined
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Candidate Queue</h1>
          <p className="text-muted-foreground mt-1">Review community submissions and AI discoveries.</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Filter Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Candidates</SelectItem>
                <SelectItem value="needs_verification">Needs Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground hidden sm:block">
            {candidates?.length || 0} candidates
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[300px]">Name & Org</TableHead>
                <TableHead>Discovered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : candidates?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    No candidates found for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                candidates?.map((candidate) => (
                  <TableRow key={candidate.id} className="group">
                    <TableCell>
                      <div className="font-medium text-foreground">{candidate.name}</div>
                      <div className="text-xs text-muted-foreground">{candidate.organization}</div>
                      {candidate.category && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {candidate.category} &bull; {candidate.stemField}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground">
                        {new Date(candidate.dateDiscovered).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(candidate.dateDiscovered), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {candidate.reviewStatus === 'needs_verification' ? (
                        <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                          Needs Review
                        </Badge>
                      ) : candidate.reviewStatus === 'approved' ? (
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">
                          Approved
                        </Badge>
                      ) : candidate.reviewStatus === 'rejected' ? (
                        <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                          Rejected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Duplicate
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/candidates/${candidate.id}`}>
                        <Button variant="ghost" size="sm" className="group-hover:bg-primary/10 group-hover:text-primary">
                          Review <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
