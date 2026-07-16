import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { 
  useGetAdminOpportunity, 
  useCreateOpportunity, 
  useUpdateOpportunity,
  getGetAdminOpportunityQueryKey,
  getListAdminOpportunitiesQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  STEM_FIELDS, 
  OPPORTUNITY_TYPES, 
  FORMAT_PREFERENCES, 
  COST_PREFERENCES, 
  EXPERIENCE_LEVELS, 
  TIME_COMMITMENTS 
} from "@/lib/constants";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  organization: z.string().min(1, "Organization is required"),
  category: z.string().min(1, "Category is required"),
  stemField: z.string().min(1, "STEM Field is required"),
  eligibleGrades: z.string().min(1, "Eligible Grades is required"),
  minAge: z.coerce.number().optional().nullable(),
  maxAge: z.coerce.number().optional().nullable(),
  location: z.string().min(1, "Location is required"),
  format: z.string().min(1, "Format is required"),
  costCategory: z.string().min(1, "Cost Category is required"),
  costAmount: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  applicationOpenDate: z.string().optional().nullable(),
  experienceLevel: z.string().min(1, "Experience Level is required"),
  timeCommitment: z.string().min(1, "Time Commitment is required"),
  requirements: z.string().min(1, "Requirements are required"),
  officialUrl: z.string().url("Must be a valid URL"),
  sourceUrls: z.string().optional().nullable(),
  summary: z.string().min(1, "Summary is required"),
  verificationStatus: z.string(),
  published: z.boolean(),
  isSampleData: z.boolean().default(false)
});

export default function AdminOpportunityForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = params.id ? parseInt(params.id, 10) : undefined;
  const isEdit = !!id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: opportunity, isLoading: isLoadingOpp } = useGetAdminOpportunity(id!, {
    query: {
      enabled: isEdit,
      queryKey: getGetAdminOpportunityQueryKey(id!)
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      organization: "",
      category: "Competition",
      stemField: "Technology",
      eligibleGrades: "9-12",
      minAge: null,
      maxAge: null,
      location: "Online",
      format: "Remote",
      costCategory: "Free",
      costAmount: "",
      deadline: "",
      applicationOpenDate: "",
      experienceLevel: "Beginner",
      timeCommitment: "Flexible",
      requirements: "",
      officialUrl: "",
      sourceUrls: "",
      summary: "",
      verificationStatus: "needs_verification",
      published: false,
      isSampleData: false
    }
  });

  useEffect(() => {
    if (opportunity && isEdit) {
      form.reset({
        name: opportunity.name,
        organization: opportunity.organization,
        category: opportunity.category,
        stemField: opportunity.stemField,
        eligibleGrades: opportunity.eligibleGrades,
        minAge: opportunity.minAge,
        maxAge: opportunity.maxAge,
        location: opportunity.location,
        format: opportunity.format,
        costCategory: opportunity.costCategory,
        costAmount: opportunity.costAmount,
        deadline: opportunity.deadline,
        applicationOpenDate: opportunity.applicationOpenDate,
        experienceLevel: opportunity.experienceLevel,
        timeCommitment: opportunity.timeCommitment,
        requirements: opportunity.requirements,
        officialUrl: opportunity.officialUrl,
        sourceUrls: opportunity.sourceUrls || "",
        summary: opportunity.summary,
        verificationStatus: opportunity.verificationStatus,
        published: opportunity.published,
        isSampleData: opportunity.isSampleData
      });
    }
  }, [opportunity, isEdit, form]);

  const createMutation = useCreateOpportunity();
  const updateMutation = useUpdateOpportunity();

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Process optional empty strings to null for API
    const data = {
      ...values,
      minAge: values.minAge || undefined,
      maxAge: values.maxAge || undefined,
      costAmount: values.costAmount || undefined,
      deadline: values.deadline || undefined,
      applicationOpenDate: values.applicationOpenDate || undefined,
      sourceUrls: values.sourceUrls || undefined,
    };

    if (isEdit) {
      updateMutation.mutate(
        { id: id!, data },
        {
          onSuccess: () => {
            toast({ title: "Opportunity updated" });
            queryClient.invalidateQueries({ queryKey: getListAdminOpportunitiesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetAdminOpportunityQueryKey(id!) });
            setLocation("/admin/opportunities");
          }
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            toast({ title: "Opportunity created" });
            queryClient.invalidateQueries({ queryKey: getListAdminOpportunitiesQueryKey() });
            setLocation("/admin/opportunities");
          }
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoadingOpp) {
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
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => setLocation("/admin/opportunities")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">
            {isEdit ? "Edit Opportunity" : "New Opportunity"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? "Update existing program details." : "Add a new program to the database."}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="md:col-span-2 border-border shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
                  <h3 className="font-serif font-semibold text-lg">Status & Visibility</h3>
                  <div className="flex items-center gap-6">
                    <FormField
                      control={form.control}
                      name="verificationStatus"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormLabel className="m-0">Verification:</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-[180px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="needs_verification">Needs Verification</SelectItem>
                              <SelectItem value="verified">Verified</SelectItem>
                              <SelectItem value="unverifiable">Unverifiable</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="published"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormLabel className="m-0 cursor-pointer">Published:</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Opportunity Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. NASA Summer Internship" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="organization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. NASA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="officialUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Official URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-serif font-semibold text-lg border-b border-border pb-2 mb-4">Classification</h3>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OPPORTUNITY_TYPES.filter(t => t !== 'Any').map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stemField"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>STEM Field</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STEM_FIELDS.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPERIENCE_LEVELS.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-serif font-semibold text-lg border-b border-border pb-2 mb-4">Logistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Format</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FORMAT_PREFERENCES.filter(t => t !== 'No Preference').map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Online, City, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="costCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COST_PREFERENCES.filter(t => t !== 'Any').map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="costAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Amount (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="$500, Fully Funded" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="timeCommitment"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Time Commitment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIME_COMMITMENTS.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-border shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-serif font-semibold text-lg border-b border-border pb-2 mb-4">Eligibility & Dates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="eligibleGrades"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eligible Grades</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 9-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Age (Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="13" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Age (Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="18" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="applicationOpenDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Open Date (Optional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline (Optional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-border shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-serif font-semibold text-lg border-b border-border pb-2 mb-4">Content</h3>
                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Summary</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the opportunity..." className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requirements</FormLabel>
                      <FormControl>
                        <Textarea placeholder="List requirements..." className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sourceUrls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source URLs (Internal)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Where did we find this?" className="min-h-[60px]" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>Comma or newline separated URLs for verification purposes.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4 mt-8 sticky bottom-4 p-4 bg-background border border-border shadow-lg rounded-xl z-10">
            <Button type="button" variant="outline" onClick={() => setLocation("/admin/opportunities")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground min-w-[120px]">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEdit ? "Save Changes" : "Create Opportunity"}
            </Button>
          </div>
        </form>
      </Form>
    </AdminLayout>
  );
}
