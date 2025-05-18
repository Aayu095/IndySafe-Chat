
import ReportHazardForm from '@/components/report/ReportHazardForm';
import IndySafeLogo from '@/components/icons/IndySafeLogo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ReportHazardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/50">
      <header className="bg-card text-card-foreground p-3 md:p-4 shadow-md sticky top-0 z-50 border-b border-border">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IndySafeLogo className="h-9 w-9 md:h-10 md:w-10 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">Report a Hazard</h1>
          </div>
           <Button asChild variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
            <Link href="/">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Chat
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-6 flex justify-center items-start pt-6 md:pt-10">
        <div className="w-full max-w-2xl">
          <ReportHazardForm />
        </div>
      </main>
       <footer className="text-center p-3 text-xs text-muted-foreground bg-card border-t border-border">
        IndySafe Chat - Empowering Indianapolis Communities
       </footer>
    </div>
  );
}
