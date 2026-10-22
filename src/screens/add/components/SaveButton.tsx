import { Button } from '@/components/ui';

type SaveButtonProps = {
  enabled: boolean;
  onPress: () => void;
};

export default function SaveButton({ enabled, onPress }: SaveButtonProps) {
  return <Button label="Save transaction" icon="checkmark" onPress={onPress} disabled={!enabled} />;
}
