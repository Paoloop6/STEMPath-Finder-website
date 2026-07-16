import { useState, useEffect } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  useListAdminOpportunities, 
  useTogglePublishOpportunity,
  useDeleteOpportunity,
  Opportunity 
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { 
  MoreHorizontal, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ShieldAlert,
  Loader2
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListAdminOpportunitiesQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminOpportunities() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Simple debounce for search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: opportunities, isLoading } = useListAdminOpportunities({
    search: debouncedSearch || undefined
  });

  const toggleMutation = useTogglePublishOpportunity();
  const deleteMutation = useDeleteOpportunity();

  const handleTogglePublish = (id: number, currentStatus: boolean) => {
    toggleMutation.mutate({ 
      id, 
      data: { published: !currentStatus } 
    }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: getListAdminOpportunitiesQueryKey() });
      }
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate({ id: deleteId }, {
      onSuccess: () => {
        toast({ title: "Opportunity deleted" });
        queryClient.invalidateQueries({ queryKey: getListAdminOpportunitiesQueryKey() });
        setDeleteId(null);
      }
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Opportunities</h1>
          <p className="text-muted-foreground mt-1">Manage all programs and competitions.</p>
        </div>
        <Link href="/admin/opportunities/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Opportunity
          </Button>
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or org..." 
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground hidden sm:block">
            {opportunities?.length || 0} total
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[300px]">Name & Organization</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : opportunities?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No opportunities found.
                  </TableCell>
                </TableRow>
              ) : (
                opportunities?.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{opp.name}</div>
                      <div className="text-xs text-muted-foreground">{opp.organization}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{opp.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {opp.verificationStatus === 'verified' ? (
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 gap-1">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </Badge>
                      ) : opp.verificationStatus === 'needs_verification' ? (
                        <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 gap-1">
                          <ShieldAlert className="h-3 w-3" /> Needs Review
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                          Unverifiable
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={opp.published} 
                          onCheckedChange={() => handleTogglePublish(opp.id, opp.published)}
                          disabled={toggleMutation.isPending && toggleMutation.variables?.id === opp.id}
                        />
                        <span className="text-xs text-muted-foreground">
                          {opp.published ? 'Live' : 'Hidden'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <a href={`/opportunities/${opp.id}`} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" /> View Public
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/opportunities/${opp.id}/edit`} className="cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setDeleteId(opp.id)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the opportunity from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AdminLayout>
  );
}
