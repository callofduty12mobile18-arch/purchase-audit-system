import React from 'react';
import { Bell, Mail, Calendar, Clock, RotateCcw } from 'lucide-react';
import { Input } from '../../components/ui/Input';

interface ChequeReminderSectionProps {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  reminderDate: string;
  reminderTime: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  /** The authenticated administrator's registered email address. */
  defaultEmail: string;
  /** When true, required fields are flagged (used after a failed validation attempt). */
  showErrors?: boolean;
}

/**
 * Email reminder controls for cheque payments.
 * Rendered only when Payment Mode = Cheque. Kept visually consistent with the
 * existing cheque clearance date row (same border/grid/brand tokens).
 */
export const ChequeReminderSection: React.FC<ChequeReminderSectionProps> = ({
  enabled,
  onEnabledChange,
  reminderDate,
  reminderTime,
  onDateChange,
  onTimeChange,
  email,
  onEmailChange,
  defaultEmail,
  showErrors = false,
}) => {
  const dateError = enabled && showErrors && !reminderDate ? 'Reminder date is required.' : undefined;
  const timeError = enabled && showErrors && !reminderTime ? 'Reminder time is required.' : undefined;
  const emailError = enabled && showErrors && !email ? 'Recipient email is required.' : undefined;

  return (
    <div className="pt-4 mt-4 border-t border-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
              enabled ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-400'
            }`}
            aria-hidden="true"
          >
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Email reminder</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Send an automatic email before the cheque clears.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Enable cheque email reminder"
          onClick={() => onEnabledChange(!enabled)}
          className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30"
        >
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-brand-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>
      </div>

      {enabled && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <Input
            id="reminder_date"
            label="Reminder date"
            type="date"
            required
            value={reminderDate}
            onChange={(e) => onDateChange(e.target.value)}
            error={dateError}
            icon={<Calendar className="h-4 w-4" />}
          />
          <Input
            id="reminder_time"
            label="Reminder time"
            type="time"
            required
            value={reminderTime}
            onChange={(e) => onTimeChange(e.target.value)}
            error={timeError}
            helperText="Sent in IST (Asia/Kolkata)"
            icon={<Clock className="h-4 w-4" />}
          />
          <div>
            <Input
              id="reminder_email"
              label="Recipient email"
              type="email"
              required
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              error={emailError}
              placeholder="admin@example.com"
              icon={<Mail className="h-4 w-4" />}
            />
            {defaultEmail && email !== defaultEmail && (
              <button
                type="button"
                onClick={() => onEmailChange(defaultEmail)}
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-800"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Use admin email ({defaultEmail})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
