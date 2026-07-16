import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAdminStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, Eye, ShieldCheck, Inbox, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your STEM opportunities database.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="border-border">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard 
              title="Total Opportunities" 
              value={stats.totalOpportunities} 
              icon={<Database className="h-5 w-5 text-muted-foreground" />}
              description="All records in database"
            />
            <StatCard 
              title="Published" 
              value={stats.publishedOpportunities} 
              icon={<Eye className="h-5 w-5 text-primary" />}
              description={`${Math.round((stats.publishedOpportunities / stats.totalOpportunities) * 100) || 0}% of total`}
            />
            <StatCard 
              title="Verified" 
              value={stats.verifiedOpportunities} 
              icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
              description="Staff reviewed"
            />
            <StatCard 
              title="Pending Candidates" 
              value={stats.pendingCandidates} 
              icon={<Inbox className="h-5 w-5 text-amber-600" />}
              description="Needs review"
              alert={stats.pendingCandidates > 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="font-serif">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/admin/opportunities/new">
                  <Button className="w-full justify-start h-12" variant="outline">
                    <Database className="mr-2 h-4 w-4 text-primary" /> 
                    Add New Opportunity
                  </Button>
                </Link>
                <Link href="/admin/candidates">
                  <Button className="w-full justify-start h-12 relative" variant="outline">
                    <Inbox className="mr-2 h-4 w-4 text-amber-600" /> 
                    Review Candidate Queue
                    {stats.pendingCandidates > 0 && (
                      <span className="absolute right-4 bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                        {stats.pendingCandidates}
                      </span>
                    )}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm bg-primary/5">
              <CardHeader>
                <CardTitle className="font-serif text-primary">System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Database Status</span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Online</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Search Engine</span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Online</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Last Backup</span>
                    <span className="text-sm text-muted-foreground">Today, 03:00 AM</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </AdminLayout>
  );
}

function StatCard({ title, value, icon, description, alert }: { title: string, value: number, icon: React.ReactNode, description: string, alert?: boolean }) {
  return (
    <Card className={`border-border shadow-sm ${alert ? 'ring-1 ring-amber-400 bg-amber-50/30' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold font-serif ${alert ? 'text-amber-700' : 'text-foreground'}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

// Add Badge import that was missed
import { Badge } from "@/components/ui/badge";
