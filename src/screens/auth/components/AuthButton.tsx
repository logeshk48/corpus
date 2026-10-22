import { Button } from '@/components/ui';

type AuthButtonProps = {
  label: string;
  loading?: boolean;
  onPress: () => void;
};

export default function AuthButton({ label, loading = false, onPress }: AuthButtonProps) {
  return <Button label={label} onPress={onPress} loading={loading} style={{ marginTop: 8 }} />;
}
