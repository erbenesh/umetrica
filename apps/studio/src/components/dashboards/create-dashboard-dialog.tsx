import { DashboardFormDialog } from '@/components/dashboards/dashboard-form-dialog';

interface CreateDashboardDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export function CreateDashboardDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateDashboardDialogProps) {
  return (
    <DashboardFormDialog
      open={open}
      title="Новый дашборд"
      submitLabel="Создать"
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
