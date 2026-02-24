import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
    <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
    <p className="text-muted-foreground mt-2">Page not found.</p>
    <Button asChild className="mt-6">
      <Link to="/">Go to dashboard</Link>
    </Button>
  </div>
);
