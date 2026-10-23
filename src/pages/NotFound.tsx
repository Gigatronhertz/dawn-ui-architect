import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Nav } from "@/components/Nav";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="min-h-screen bg-background">
      <Nav />
      <div aria-hidden="true" className="h-[77px]" />
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-32 flex flex-col items-start gap-6">
        <div className="kj-title">Wrong <span className="kj-hl">turn.</span></div>
        <p className="text-base md:text-lg text-muted-foreground max-w-md">
          This page doesn't exist — but plenty of trips do.
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <Link to="/" className="kj-btn text-base">Back home</Link>
          <Link to="/start/explore" className="kj-label text-xs text-signal hover:underline underline-offset-4">Browse trips →</Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
