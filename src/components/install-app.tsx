import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const receive = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const complete = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", receive);
    window.addEventListener("appinstalled", complete);
    return () => {
      window.removeEventListener("beforeinstallprompt", receive);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  return (
    <div className="mt-5 border-t pt-4">
      <h3 className="font-medium">Install FitTrack</h3>
      <p className="my-2 text-sm text-muted-foreground">
        {installed
          ? "FitTrack is installed on this device."
          : "Use your browser menu to install or add FitTrack to your home screen where supported. Internet is required for logging."}
      </p>
      {prompt && (
        <Button
          variant="outline"
          onClick={async () => {
            await prompt.prompt();
            await prompt.userChoice;
            setPrompt(null);
          }}
        >
          Install app
        </Button>
      )}
    </div>
  );
}
