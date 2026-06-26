/** Shown on admin-gated screens (designer, settings, warehouse management) to operators. */
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

export function AdminOnlyNotice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          Administrator only
        </CardTitle>
        <CardDescription>
          This screen is for administrators. Switch to the Admin role on the overview to design
          warehouses or change settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link to="/warehouse-ops">Back to overview</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
