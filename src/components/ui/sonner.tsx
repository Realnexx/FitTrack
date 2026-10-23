import { Toaster as Sonner } from "sonner";
import { CircleCheck, TriangleAlert, Info, CircleX, Loader2 } from "lucide-react";
type ToasterProps = React.ComponentProps<typeof Sonner>;
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      closeButton
      visibleToasts={3}
      duration={4500}
      gap={10}
      offset={20}
      mobileOffset={{ top: 16, left: 16, right: 16 }}
      icons={{
        success: <CircleCheck className="size-5" />,
        error: <CircleX className="size-5" />,
        warning: <TriangleAlert className="size-5" />,
        info: <Info className="size-5" />,
        loading: <Loader2 className="size-5 animate-spin" />,
      }}
      className="fittrack-toaster"
      toastOptions={{
        classNames: {
          toast: "fittrack-toast",
          title: "fittrack-toast-title",
          description: "fittrack-toast-description",
          icon: "fittrack-toast-icon",
          closeButton: "fittrack-toast-close",
          actionButton: "fittrack-toast-action",
          cancelButton: "fittrack-toast-cancel",
        },
      }}
      {...props}
    />
  );
}
