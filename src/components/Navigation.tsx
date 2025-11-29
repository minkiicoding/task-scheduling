import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, User, FileBarChart, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  canEdit: boolean;
  userPosition?: string;
  isPartner?: boolean;
}

export const Navigation = ({ canEdit, userPosition, isPartner }: NavigationProps) => {
  const location = useLocation();

  // Admin users (position === 'Admin') should only see Admin menu
  const isSystemAdmin = userPosition === 'Admin';

  // Check if user can view reports (Senior+ positions, editors, or partners)
  const isSeniorOrAbove = userPosition &&
    ['Senior', 'Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Director', 'Partner'].includes(userPosition);
  const canViewReport = canEdit || isPartner || isSeniorOrAbove;

  return (
    <div className="border-b border-border bg-card">
      <div className="flex gap-1 px-4">
        {!isSystemAdmin && (
          <>
            <Link
              to="/"
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
                location.pathname === '/'
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="w-4 h-4" />
              My Schedule
            </Link>

            {canViewReport && (
              <Link
                to="/reports"
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
                  (location.pathname === '/reports' || location.pathname === '/report/availability')
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <FileBarChart className="w-4 h-4" />
                Reports
              </Link>
            )}
          </>
        )}

        {isSystemAdmin && (
          <>
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
                location.pathname === '/admin'
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Admin Dashboard
            </Link>
            <Link
              to="/data-management"
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
                location.pathname === '/data-management'
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Database className="w-4 h-4" />
              Data Management
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
