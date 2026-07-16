import { useState } from "react";
import { Link, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  STEM_FIELDS, 
  OPPORTUNITY_TYPES, 
  FORMAT_PREFERENCES, 
  COST_PREFERENCES, 
  EXPERIENCE_LEVELS, 
  TIME_COMMITMENTS 
} from "@/lib/constants";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useStudentProfile } from "@/hooks/use-profile";
import { useMatchOpportunities } from "@workspace/api-client-react";
import { Loader2, ArrowRight, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  grade: z.coerce.number().min(6).max(12),
  age: z.coerce.number().min(10).max(20),
  stemInterest: z.string().min(1, "Please select an interest"),
  opportunityType: z.string().min(1, "Please select an opportunity type"),
  locationPreference: z.string().optional().default(""),
  formatPreference: z.string().min(1, "Please select a format"),
  costPreference: z.string().min(1, "Please select a cost preference"),
  experienceLevel: z.string().min(1, "Please select an experience level"),
  timeCommitment: z.string().min(1, "Please select a time commitment"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function MatchForm() {
  const [, setLocation] = useLocation();
  const { profile, setProfile } = useStudentProfile();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile || {
      grade: 9,
      age: 14,
      stemInterest: "",
      opportunityType: "Any",
      locationPreference: "",
      formatPreference: "No Preference",
      costPreference: "Any",
      experienceLevel: "Beginner",
      timeCommitment: "Flexible",
    },
  });

  const matchMutation = useMatchOpportunities();

  const onSubmit = (data: ProfileFormValues) => {
    // Store in local storage
    setProfile(data);
    
    // Call match api
    matchMutation.mutate(
      { data },
      {
        onSuccess: (results) => {
          // Pass results via location state using wouter
          history.pushState({ results, profile: data }, "", "/results");
          setLocation("/results");
        },
      }
    );
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof ProfileFormValues)[] = [];
    if (step === 1) fieldsToValidate = ['grade', 'age'];
    else if (step === 2) fieldsToValidate = ['stemInterest', 'experienceLevel'];
    else if (step === 3) fieldsToValidate = ['opportunityType', 'timeCommitment'];

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <MainLayout>
      <div className="flex-1 bg-muted/30 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-3xl font-serif font-bold text-foreground">Find Your Match</h1>
              <span className="text-sm font-medium text-muted-foreground">Step {step} of {totalSteps}</span>
            </div>
            <div className="w-full bg-border rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          <Card className="shadow-lg border-card-border overflow-hidden">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                
                {/* STEP 1: Basic Info */}
                <div className={cn("p-8", step === 1 ? "block" : "hidden")}>
                  <div className="text-center mb-8">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl font-serif mb-2">Let's start with the basics</CardTitle>
                    <CardDescription className="text-base">We use this to check program eligibility and age requirements.</CardDescription>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">What grade are you in?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                            <FormControl>
                              <SelectTrigger className="h-12 text-lg">
                                <SelectValue placeholder="Select a grade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                                <SelectItem key={g} value={g.toString()}>
                                  {g}th Grade
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">How old are you?</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-12 text-lg" min={10} max={20} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* STEP 2: Interests */}
                <div className={cn("p-8", step === 2 ? "block" : "hidden")}>
                  <CardTitle className="text-2xl font-serif mb-6 text-center">What are you passionate about?</CardTitle>
                  
                  <div className="space-y-8">
                    <FormField
                      control={form.control}
                      name="stemInterest"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base mb-4 block">Primary STEM Interest</FormLabel>
                          <FormControl>
                            <ToggleGroup 
                              type="single" 
                              value={field.value} 
                              onValueChange={(val) => val && field.onChange(val)}
                              className="flex flex-wrap gap-2 justify-start"
                            >
                              {STEM_FIELDS.map((stem) => (
                                <ToggleGroupItem 
                                  key={stem} 
                                  value={stem}
                                  className="h-10 px-4 rounded-full border border-border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                                >
                                  {stem}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="experienceLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base mb-4 block">Experience level in this field</FormLabel>
                          <FormControl>
                            <RadioGroup 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              className="grid grid-cols-1 md:grid-cols-3 gap-4"
                            >
                              {EXPERIENCE_LEVELS.map((level) => (
                                <FormItem key={level} className="flex flex-col items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-primary">
                                  <FormControl>
                                    <RadioGroupItem value={level} className="sr-only" />
                                  </FormControl>
                                  <CheckCircle2 className={cn("h-6 w-6 mb-2 text-primary opacity-0 transition-opacity", field.value === level ? "opacity-100" : "")} />
                                  <FormLabel className="font-medium cursor-pointer text-center w-full">
                                    {level}
                                  </FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* STEP 3: Commitment */}
                <div className={cn("p-8", step === 3 ? "block" : "hidden")}>
                  <CardTitle className="text-2xl font-serif mb-6 text-center">What kind of opportunity?</CardTitle>
                  
                  <div className="space-y-8">
                    <FormField
                      control={form.control}
                      name="opportunityType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base mb-4 block">Preferred Type</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 text-lg">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {OPPORTUNITY_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timeCommitment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base mb-4 block">Time Commitment</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 text-lg">
                                  <SelectValue placeholder="How much time can you commit?" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {TIME_COMMITMENTS.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* STEP 4: Logistics */}
                <div className={cn("p-8", step === 4 ? "block" : "hidden")}>
                  <CardTitle className="text-2xl font-serif mb-6 text-center">Logistics & Preferences</CardTitle>
                  
                  <div className="space-y-8">
                    <FormField
                      control={form.control}
                      name="formatPreference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base mb-4 block">Format</FormLabel>
                          <FormControl>
                            <ToggleGroup 
                              type="single" 
                              value={field.value} 
                              onValueChange={(val) => val && field.onChange(val)}
                              className="flex flex-wrap gap-2 justify-start"
                            >
                              {FORMAT_PREFERENCES.map((format) => (
                                <ToggleGroupItem 
                                  key={format} 
                                  value={format}
                                  className="h-10 px-4 rounded-full border border-border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                                >
                                  {format}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('formatPreference') !== 'Remote' && (
                      <FormField
                        control={form.control}
                        name="locationPreference"
                        render={({ field }) => (
                          <FormItem className="animate-in fade-in slide-in-from-top-4">
                            <FormLabel className="text-base">City or State (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. San Francisco, CA or New York" {...field} className="h-12 text-lg" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="costPreference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base mb-4 block">Cost Preference</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 text-lg">
                                  <SelectValue placeholder="Cost constraint" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {COST_PREFERENCES.map((cost) => (
                                  <SelectItem key={cost} value={cost}>
                                    {cost}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <CardFooter className="px-8 py-6 bg-muted/50 border-t border-border flex justify-between">
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={prevStep} className="h-12 px-6">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                  ) : (
                    <div></div>
                  )}
                  
                  {step < totalSteps ? (
                    <Button type="button" onClick={nextStep} className="h-12 px-8 ml-auto">
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      className="h-12 px-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold ml-auto shadow-md"
                      disabled={matchMutation.isPending}
                    >
                      {matchMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Scoring matches...
                        </>
                      ) : (
                        <>
                          Find My Matches <Sparkles className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
