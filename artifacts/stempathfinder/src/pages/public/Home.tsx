import { Link } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Compass, Search, Target, ArrowRight, ShieldCheck, Clock, MapPin, ChevronRight, BookOpen } from "lucide-react";
import { useListOpportunities } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function Home() {
  const { data: opportunities, isLoading } = useListOpportunities({ search: "" });
  
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/5 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-6 border-primary/20 text-primary bg-primary/5 px-4 py-1.5 rounded-full text-sm font-medium">
              For ambitious middle & high school students
            </Badge>
            <h1 className="text-5xl md:text-7xl font-serif font-extrabold text-foreground tracking-tight mb-6">
              Find your <span className="text-primary relative inline-block">
                STEM path
                <div className="absolute bottom-1 left-0 right-0 h-3 bg-secondary/30 -z-10 rounded-sm"></div>
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              Stop endlessly searching. Answer a few questions and we'll match you with verified competitions, summer programs, and internships tailored to your goals.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/match">
                <Button size="lg" className="h-14 px-8 text-lg font-semibold gap-2 shadow-lg hover:shadow-xl transition-all hover-elevate">
                  Find Opportunities <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-medium bg-white" onClick={() => {
                document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Explore Catalog
              </Button>
            </div>
            
            <div className="mt-14 pt-10 border-t border-border/50 grid grid-cols-3 gap-6 opacity-80">
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="w-8 h-8 text-primary" />
                <span className="text-sm font-medium text-foreground">100% Verified</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Target className="w-8 h-8 text-secondary" />
                <span className="text-sm font-medium text-foreground">Smart Matching</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Clock className="w-8 h-8 text-chart-4" />
                <span className="text-sm font-medium text-foreground">Track Deadlines</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section id="explore" className="py-24 bg-muted/30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-serif font-bold text-foreground mb-4">Featured Opportunities</h2>
              <p className="text-muted-foreground max-w-2xl text-lg">Programs, internships, and competitions hand-picked by our team.</p>
            </div>
            <Link href="/match" className="hidden sm:flex text-primary font-medium hover:underline items-center gap-1">
              View all matches <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
                  <Skeleton className="h-6 w-24 mb-4 rounded-full" />
                  <Skeleton className="h-8 w-full mb-2" />
                  <Skeleton className="h-6 w-3/4 mb-6" />
                  <Skeleton className="h-20 w-full mb-6" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))
            ) : opportunities && opportunities.length > 0 ? (
              opportunities.slice(0, 6).map((opp) => (
                <Link key={opp.id} href={`/opportunities/${opp.id}`} className="group block bg-card border border-card-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all hover:border-primary/30 h-full flex flex-col hover-elevate">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className="bg-secondary/10 text-secondary-foreground border-secondary/20 hover:bg-secondary/20">
                      {opp.category}
                    </Badge>
                    {opp.format === 'Remote' && (
                      <Badge variant="outline" className="text-xs bg-white text-muted-foreground border-muted-foreground/30">
                        Remote
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {opp.name}
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> {opp.organization}
                  </p>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-grow">
                    {opp.summary}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-auto pt-4 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate max-w-[120px]">{opp.location === 'Online' ? 'Remote' : opp.location}</span>
                    </div>
                    {opp.deadline && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(opp.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-border">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No opportunities found</h3>
                <p className="text-muted-foreground">Check back later for new programs and competitions.</p>
              </div>
            )}
          </div>
          <div className="mt-10 text-center sm:hidden">
            <Link href="/match" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
              View all matches <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="bg-primary py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-serif font-bold text-primary-foreground mb-6">Ready to find your perfect fit?</h2>
          <p className="text-xl text-primary-foreground/80 mb-10">
            Tell us about your interests, grade, and goals. We'll score every opportunity to show you the ones you're most likely to love.
          </p>
          <Link href="/match">
            <Button size="lg" className="h-14 px-10 text-lg font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xl hover-elevate">
              Take the Matching Quiz
            </Button>
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}

export default Home;
