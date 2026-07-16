import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { MatchResult } from "@workspace/api-client-react";
import { ChevronLeft, Filter, AlertCircle, Calendar, MapPin, Building, Trophy, ArrowRight, ShieldCheck, HelpCircle, Clock } from "lucide-react";
import { useStudentProfile } from "@/hooks/use-profile";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Results() {
  const [, setLocation] = useLocation();
  const { profile } = useStudentProfile();
  const [results, setResults] = useState<MatchResult[]>([]);
  const [filter, setFilter] = useState<'All' | 'Eligible'>('All');

  useEffect(() => {
    // Read state from history
    const state = history.state;
    if (!state || !state.results) {
      // If we land here without state, but have a profile, we should ideally re-run the match.
      // But for simplicity, we redirect back to match form.
      setLocation("/match");
      return;
    }
    setResults(state.results);
  }, [setLocation]);

  if (!results.length) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-medium text-muted-foreground">Loading your matches...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const displayedResults = filter === 'Eligible' 
    ? results.filter(r => r.eligibilityLabel === 'Eligible' || r.eligibilityLabel === 'Maybe Eligible')
    : results;

  return (
    <MainLayout>
      <div className="bg-primary/5 py-8 border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/match" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Profile
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Your Matches</h1>
              <p className="text-muted-foreground text-lg">
                We scored {results.length} opportunities based on your profile. Here are your best fits.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filter === 'All' ? 'default' : 'outline'} 
                onClick={() => setFilter('All')}
                className="rounded-full"
              >
                All Matches
              </Button>
              <Button 
                variant={filter === 'Eligible' ? 'default' : 'outline'} 
                onClick={() => setFilter('Eligible')}
                className="rounded-full"
              >
                Eligible Only
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {displayedResults.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-foreground mb-2">No matches found with this filter</h3>
            <p className="text-muted-foreground mb-6">Try broadening your criteria to see more opportunities.</p>
            <Button onClick={() => setFilter('All')} variant="outline">View All Matches</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {displayedResults.map((result, idx) => (
              <ResultCard key={result.opportunity.id} result={result} rank={idx + 1} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function ResultCard({ result, rank }: { result: MatchResult, rank: number }) {
  const { opportunity, score, scoreBreakdown, eligibilityLabel, deadlineLabel } = result;

  // Determine colors based on score
  let scoreColor = "text-red-600 bg-red-50";
  let progressColor = "bg-red-500";
  if (score >= 80) {
    scoreColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
    progressColor = "bg-emerald-500";
  } else if (score >= 60) {
    scoreColor = "text-amber-700 bg-amber-50 border-amber-200";
    progressColor = "bg-amber-500";
  }

  const getEligibilityBadge = () => {
    switch (eligibilityLabel) {
      case 'Eligible': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">Eligible</Badge>;
      case 'Maybe Eligible': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none">Maybe Eligible</Badge>;
      case 'Not Eligible': return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none">Not Eligible</Badge>;
      default: return <Badge variant="outline">{eligibilityLabel}</Badge>;
    }
  };

  const getDeadlineBadge = () => {
    switch (deadlineLabel) {
      case 'Apply Now': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Apply Now</Badge>;
      case 'Closing Soon': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none flex items-center gap-1"><Clock className="w-3 h-3"/> Closing Soon</Badge>;
      case 'Closed': return <Badge className="bg-muted text-muted-foreground border-none">Closed</Badge>;
      default: return <Badge variant="outline">{deadlineLabel}</Badge>;
    }
  };

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md border-card-border ${score >= 80 ? 'ring-1 ring-primary/20' : ''}`}>
      <div className="flex flex-col md:flex-row">
        {/* Score Section */}
        <div className={`md:w-48 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border bg-muted/20 relative`}>
          {rank <= 3 && (
            <div className="absolute top-0 right-0 w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 bg-secondary transform rotate-45 translate-x-1/2 -translate-y-1/2"></div>
              <span className="absolute top-2 right-2 text-xs font-bold text-secondary-foreground z-10">#{rank}</span>
            </div>
          )}
          <div className="text-center mb-4">
            <div className={`text-4xl font-bold font-serif mb-1 ${scoreColor.split(' ')[0]}`}>{score}</div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Match Score</div>
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full cursor-help">
                <Progress value={score} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Breakdown</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-4 w-64">
              <h4 className="font-semibold mb-2 text-sm border-b pb-1">Score Breakdown</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Eligibility:</span> <span className="font-medium">+{scoreBreakdown.basicEligibility}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Interest:</span> <span className="font-medium">+{scoreBreakdown.stemInterest}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type:</span> <span className="font-medium">+{scoreBreakdown.opportunityType}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Location/Format:</span> <span className="font-medium">+{scoreBreakdown.locationFormat}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cost:</span> <span className="font-medium">+{scoreBreakdown.costPreference}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Experience:</span> <span className="font-medium">+{scoreBreakdown.experienceLevel}</span></div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex flex-wrap gap-2 mb-3">
            {getEligibilityBadge()}
            {getDeadlineBadge()}
            <Badge variant="outline" className="bg-background text-muted-foreground">{opportunity.category}</Badge>
            {opportunity.verificationStatus === 'verified' && (
              <Badge variant="outline" className="border-primary/30 text-primary flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified
              </Badge>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-2xl font-bold font-serif text-foreground mb-2 group-hover:text-primary transition-colors">
              {opportunity.name}
            </h3>
            
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground mb-4">
              <span className="flex items-center gap-1.5 text-foreground"><Building className="w-4 h-4 text-primary/70" /> {opportunity.organization}</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary/70" /> {opportunity.location === 'Online' ? 'Remote' : opportunity.location}</span>
              <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-primary/70" /> {opportunity.stemField}</span>
            </div>

            <p className="text-muted-foreground text-sm line-clamp-2 mb-4 leading-relaxed">
              {opportunity.summary}
            </p>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="flex gap-4 text-sm">
              <span className="hidden sm:inline-flex items-center text-muted-foreground">
                <span className="font-medium text-foreground mr-1">Grades:</span> {opportunity.eligibleGrades}
              </span>
              <span className="hidden sm:inline-flex items-center text-muted-foreground">
                <span className="font-medium text-foreground mr-1">Cost:</span> {opportunity.costCategory}
              </span>
            </div>
            <Link href={`/opportunities/${opportunity.id}`}>
              <Button variant="default" className="font-semibold gap-1 shadow-sm hover-elevate">
                View Details <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
