"use client";

import { useSyncExternalStore } from "react";
import { Label } from "@phonemail/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@phonemail/ui/components/select";
import { Switch } from "@phonemail/ui/components/switch";
import { MoonIcon, SunIcon } from "@phonemail/ui/components/icons";
import { useTheme } from "@phonemail/ui/components/theme-provider";

export function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const isDark = theme === "dark" || (theme === "system" && resolvedTheme === "dark");

  return <section className="space-y-4 rounded-2xl border border-border p-4 sm:p-5" aria-labelledby="appearance-title">
    <div><h2 id="appearance-title" className="font-semibold">Appearance</h2><p className="mt-1 text-sm text-muted-foreground">Choose how PhoneMail looks on this device.</p></div>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3"><SunIcon aria-hidden="true" className="size-5 text-muted-foreground" /><Label htmlFor="dark-mode-switch">Dark mode</Label><Switch id="dark-mode-switch" aria-label="Toggle dark mode" checked={mounted && isDark} disabled={!mounted} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} /><MoonIcon aria-hidden="true" className="size-5 text-muted-foreground" /></div>
      <div className="flex items-center gap-3"><Label htmlFor="theme-mode">Theme mode</Label><Select value={mounted ? theme : "system"} onValueChange={(value) => setTheme(value)}><SelectTrigger id="theme-mode" className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem><SelectItem value="system">System</SelectItem></SelectContent></Select></div>
    </div>
  </section>;
}
