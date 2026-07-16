import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  useGetOpportunity, 
  useMatchOpportunities,
  MatchResult
} from "@workspace/api-client-react";
import { useStudentProfile } from "@/hooks/use-profile";
import { 
  ChevronLeft, 
  Building, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Clock, 
  Trophy, 
  GraduationCap, 
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Info
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function OpportunityDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { profile } = useStudentProfile();
  
  const { data: opportunity, isLoading, isError } = useGetOpportunity(id, {
    query: {
      enabled: !!id,
      queryKey: ["opportunity", id]
    }
  });

  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const matchMutation = useMatchOpportunities();

  useEffect(() => {
    // If we have a profile and the opportunity loaded, run a single match against this opportunity
    if (profile && opportunity && !matchResult && !matchMutation.isPending) {
      matchMutation.mutate({ data: profile }, {
        onSuccess: (results) => {
          // Find the matching result for this specific opportunity
          const specificMatch = results.find(r => r.opportunity.id === opportunity.id);
          if (specificMatch) {
            setMatchResult(specificMatch);
          }
        }
      });
    }
  }, [profile, opportunity]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-60 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isError || !opportunity) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Opportunity not found</h2>
          <p className="text-muted-foreground mb-6">The opportunity you're looking for doesn't exist or has been removed.</p>
          <Link href="/match">
            <Button>Go Back</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const isVerified = opportunity.verificationStatus === 'verified';
  const showMatch = profile && matchResult;

  return (
    <MainLayout>
      {/* Header Banner */}
      <div className="bg-primary/5 border-b border-border py-12 relative overflow-hidden">
        {opportunity.isSampleData && (
          <div className="absolute top-0 left-0 right-0 bg-amber-500/10 text-amber-800 text-xs font-semibold py-1 text-center border-b border-amber-500/20">
            Sample Data - Not a real opportunity
          </div>
        )}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Link href="/results" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Results
          </Link>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground hover:bg-secondary/30">
              {opportunity.category}
            </Badge>
            {isVerified && (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified
              </Badge>
            )}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
            {opportunity.name}
          </h1>
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-muted-foreground text-lg">
            <span className="flex items-center gap-2 text-foreground font-medium">
              <Building className="w-5 h-5 text-primary" /> {opportunity.organization}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="w-5 h-5" /> {opportunity.location}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* Match Score Banner - Only shown if profile exists */}
            {showMatch && (
              <Card className={`border-2 ${matchResult.score >= 80 ? 'border-primary/30 bg-primary/5' : 'border-muted'}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                        Your Match Score: <span className="text-2xl font-serif text-primary">{matchResult.score}/100</span>
                      </h3>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="bg-background">{matchResult.eligibilityLabel}</Badge>
                        <Badge variant="outline" className="bg-background">{matchResult.deadlineLabel}</Badge>
                      </div>
                    </div>
                    
                    <div className="w-full sm:w-1/2">
                      <Progress value={matchResult.score} className="h-3 mb-2" />
                      <div className="text-sm text-muted-foreground text-right">
                        Based on your {profile.grade}th grade profile
                      </div>
                    </div>
                  </div>
                  
                  {/* Match Reasons */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {matchResult.matchReasons.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Good fit because
                        </h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {matchResult.matchReasons.map((r, i) => <li key={i}>• {r}</li>)}
                        </ul>
                      </div>
                    )}
                    {matchResult.nonMatchReasons.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> Keep in mind
                        </h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {matchResult.nonMatchReasons.map((r, i) => <li key={i}>• {r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <section>
              <h2 className="text-2xl font-serif font-bold mb-4">About this opportunity</h2>
              <div className="prose prose-slate max-w-none text-muted-foreground">
                <p className="whitespace-pre-wrap text-lg leading-relaxed">{opportunity.summary}</p>
              </div>
            </section>

            {/* Requirements */}
            {opportunity.requirements && (
              <section>
                <h2 className="text-2xl font-serif font-bold mb-4">Requirements & Qualifications</h2>
                <div className="bg-muted/30 rounded-xl p-6 border border-border">
                  <p className="whitespace-pre-wrap text-foreground leading-relaxed">{opportunity.requirements}</p>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Action Card */}
            <Card className="border-card-border shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
              <CardContent className="p-6">
                <Button className="w-full h-12 text-lg font-bold mb-4 shadow-sm" asChild>
                  <a href={opportunity.officialUrl} target="_blank" rel="noopener noreferrer">
                    Visit Official Site <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Applications are handled on the official website.
                </p>
              </CardContent>
            </Card>

            {/* Key Details Card */}
            <Card className="border-card-border">
              <CardHeader className="bg-muted/20 border-b border-border pb-4">
                <CardTitle className="text-lg font-serif">Key Details</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  <DetailRow icon={<GraduationCap />} label="Eligible Grades" value={opportunity.eligibleGrades} />
                  <DetailRow icon={<Trophy />} label="STEM Field" value={opportunity.stemField} />
                  <DetailRow icon={<DollarSign />} label="Cost" value={`${opportunity.costCategory}${opportunity.costAmount ? ` (${opportunity.costAmount})` : ''}`} />
                  <DetailRow icon={<Calendar />} label="Deadline" value={opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString() : 'Rolling / Not specified'} />
                  <DetailRow icon={<Clock />} label="Commitment" value={opportunity.timeCommitment} />
                  <DetailRow icon={<Building />} label="Format" value={opportunity.format} />
                </ul>
              </CardContent>
            </Card>

            {/* Verification Notice */}
            {!isVerified && (
              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertTitle className="font-semibold text-amber-800">Unverified Listing</AlertTitle>
                <AlertDescription className="text-amber-700/80 text-xs mt-1">
                  This opportunity was submitted by the community and hasn't been verified by our team yet. Always check the official website.
                </AlertDescription>
              </Alert>
            )}

          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <li className="flex items-start p-4 hover:bg-muted/10 transition-colors">
      <div className="text-primary/70 mr-4 mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-0.5">{label}</p>
        <p className="text-foreground font-medium">{value}</p>
      </div>
    </li>
  );
}
// Required imports added above
import { CheckCircle2 } from "lucide-react";
import { AlertCircle } from "lucide-react";
