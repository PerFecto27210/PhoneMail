export function OnboardingProgress({ step }: { step: 1 | 2 }) {
  return <div aria-label={`Step ${step} of 2`} className="mx-auto flex w-40 items-center gap-2"><span className="size-2.5 rounded-full bg-primary" /><span className="h-0.5 flex-1 bg-primary/30" /><span className={`size-2.5 rounded-full ${step === 2 ? "bg-primary" : "bg-border"}`} /></div>;
}
