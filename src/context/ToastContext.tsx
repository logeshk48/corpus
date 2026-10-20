import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from './ToastContext.styles';

export type ToastOptions = {
  message: string;
  actionLabel?: string;               // e.g. "Undo"
  onAction?: () => void | Promise<void>;
  duration?: number;                  // ms, default 5000
};

type ToastContextType = {
  showToast: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const showToast = useCallback((options: ToastOptions) => {
    clearTimer();
    setToast(options); // a new toast replaces the current one
    timer.current = setTimeout(() => setToast(null), options.duration ?? 5000);
  }, []);

  useEffect(() => clearTimer, []); // stop the timer if the app unmounts

  const handleAction = async () => {
    const action = toast?.onAction;
    clearTimer();
    setToast(null);
    try {
      await action?.();
    } catch (e) {
      console.error('Toast action failed:', e);
      showToast({ message: 'That did not work. Please try again.' });
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <View style={styles.root}>
        {children}
        {toast && (
          <View style={styles.wrap} pointerEvents="box-none">
            <View style={styles.toast}>
              <Text style={styles.message}>{toast.message}</Text>
              {toast.actionLabel && (
                <Pressable onPress={handleAction} hitSlop={10}>
                  <Text style={styles.action}>{toast.actionLabel.toUpperCase()}</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
