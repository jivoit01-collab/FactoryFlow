/** Shown on WMS feature pages when the master flag is off. */
import { PowerOff, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

export function WmsDisabledNotice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PowerOff className="h-5 w-5 text-muted-foreground" />
          Warehouse module is turned off
        </CardTitle>
        <CardDescription>
          Enable it in settings to design warehouses and run warehouse workflows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/warehouse-ops/settings">
            <Settings2 className="mr-2 h-4 w-4" />
            Open settings
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
