/**
 * ETP / STP hub — the module's landing page.
 *
 * Answers the only question the plant team has at the start of a shift: which
 * of today's registers are still blank, is anything out of spec, and is any
 * instrument due for calibration.
 */

import {
  Beaker,
  CalendarCheck,
  CheckCircle2,
  Circle,
  Droplets,
  FlaskConical,
  Gauge,
  Settings,
  ShowerHead,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { COMPANY_CODE_LIST, COMPANY_LABELS, type CompanyCode } from '@/config/constants';
import { ETP_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';

import { useEtpDashboard } from '../api';
import type { EtpDashboardPlantCard } from '../types';
import { todayISO } from '../utils';

const REGISTERS = [
  {
    path: '/etp/daily-log',
    title: 'Daily Plant Log',
    description: 'Inlet / outlet flow, pH, energy meter — one row a day',
    icon: Droplets,
    permissions: [ETP_PERMISSIONS.VIEW_DAILY_LOG, ETP_PERMISSIONS.MANAGE_DAILY_LOG],
  },
  {
    path: '/etp/monitoring',
    title: 'On-line Monitoring',
    description: 'Two-hourly pH / TDS / DO across influent, aeration and treated',
    icon: Gauge,
    permissions: [ETP_PERMISSIONS.VIEW_MONITORING, ETP_PERMISSIONS.MANAGE_MONITORING],
  },
  {
    path: '/etp/chemicals',
    title: 'Chemical Consumption',
    description: 'What was dosed today, per chemical',
    icon: FlaskConical,
    permissions: [ETP_PERMISSIONS.VIEW_CHEMICAL, ETP_PERMISSIONS.MANAGE_CHEMICAL],
  },
  {
    path: '/etp/sludge',
    title: 'Sludge Generation',
    description: 'Quantity, collection mode and storage',
    icon: Trash2,
    permissions: [ETP_PERMISSIONS.VIEW_SLUDGE, ETP_PERMISSIONS.MANAGE_SLUDGE],
  },
  {
    path: '/etp/backwash',
    title: 'Daily Back Washing',
    description: 'Filter back-wash and rinse contact times',
    icon: ShowerHead,
    permissions: [ETP_PERMISSIONS.VIEW_BACKWASH, ETP_PERMISSIONS.MANAGE_BACKWASH],
  },
  {
    path: '/etp/calibration',
    title: 'Calibration',
    description: 'Instrument buffer checks and due dates',
    icon: Beaker,
    permissions: [ETP_PERMISSIONS.VIEW_CALIBRATION, ETP_PERMISSIONS.MANAGE_CALIBRATION],
  },
];

function StatusLine({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={done ? '' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

function PlantCard({ card }: { card: EtpDashboardPlantCard }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold">
              {card.plant_code} — {card.plant_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {card.companies_display || 'Not attributed to a company'}
            </div>
          </div>
          {card.monitoring_out_of_spec > 0 && (
            <Badge variant="destructive">{card.monitoring_out_of_spec} out of spec</Badge>
          )}
        </div>
        <div className="space-y-1">
          <StatusLine done={card.daily_log_done} label="Daily plant log" />
          <StatusLine done={card.chemical_log_done} label="Chemical consumption" />
          <StatusLine
            done={card.monitoring_readings > 0}
            label={`Monitoring — ${card.monitoring_readings} reading${
              card.monitoring_readings === 1 ? '' : 's'
            }${card.monitoring_verified ? ', verified' : ''}`}
          />
          <StatusLine
            done={card.backwash_entries > 0}
            label={`Back washing — ${card.backwash_entries} step${
              card.backwash_entries === 1 ? '' : 's'
            }`}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Last sludge entry: {card.last_sludge_date ?? 'never'}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EtpHubPage() {
  const { hasPermission } = usePermission();
  const [date, setDate] = useState(todayISO());
  const [company, setCompany] = useState<CompanyCode | ''>('');
  const { data, isLoading } = useEtpDashboard({
    date,
    company: company || undefined,
  });

  const visibleRegisters = REGISTERS.filter((register) =>
    register.permissions.some((permission) => hasPermission(permission)),
  );
  const canManageSettings = hasPermission(ETP_PERMISSIONS.MANAGE_SETTINGS);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="ETP / STP Plant"
        description="Treatment-plant registers — daily log, on-line monitoring, chemicals, sludge, back washing and calibration"
      >
        {canManageSettings && (
          <Link
            to="/etp/settings"
            className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
        )}
      </DashboardHeader>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div>
            <Label htmlFor="etp-hub-date">Day</Label>
            <Input
              id="etp-hub-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="min-w-[180px]">
            <Label htmlFor="etp-hub-company">Company</Label>
            <NativeSelect
              id="etp-hub-company"
              value={company}
              onChange={(event) => setCompany(event.target.value as CompanyCode | '')}
            >
              <SelectOption value="">All companies</SelectOption>
              {COMPANY_CODE_LIST.map((code) => (
                <SelectOption key={code} value={code}>
                  {COMPANY_LABELS[code]}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading today’s status…</div>
      ) : (data?.plants.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No plants configured yet.
            {canManageSettings && (
              <>
                {' '}
                <Link to="/etp/settings" className="underline">
                  Add your ETP / STP in Settings
                </Link>
                .
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.plants.map((card) => (
            <PlantCard key={card.plant} card={card} />
          ))}
        </div>
      )}

      {(data?.calibration_due.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b px-4 py-3 font-medium">
              <CalendarCheck className="h-4 w-4" /> Calibration due
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Instrument</th>
                    <th className="px-3 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">Plant</th>
                    <th className="px-3 py-2 font-medium">Last done</th>
                    <th className="px-3 py-2 font-medium">Due</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.calibration_due.map((row) => (
                    <tr key={row.instrument} className="border-b last:border-0">
                      <td className="px-3 py-2">{row.equipment_name}</td>
                      <td className="px-3 py-2">{row.equipment_id}</td>
                      <td className="px-3 py-2">{row.plant_code || '—'}</td>
                      <td className="px-3 py-2">{row.last_calibration_date ?? 'never'}</td>
                      <td className="px-3 py-2">{row.due_date ?? '—'}</td>
                      <td className="px-3 py-2">
                        {row.is_overdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : row.last_calibration_date === null ? (
                          <Badge variant="secondary">Never calibrated</Badge>
                        ) : (
                          <Badge variant="secondary">Due soon</Badge>
                        )}
                        {row.was_out_of_calibration && (
                          <span className="ml-2 text-xs text-destructive">
                            last check out of tolerance
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleRegisters.map((register) => {
          const Icon = register.icon;
          return (
            <Link key={register.path} to={register.path}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardContent className="flex items-start gap-3 p-4">
                  <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{register.title}</div>
                    <div className="text-sm text-muted-foreground">{register.description}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
