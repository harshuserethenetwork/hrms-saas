import { useEffect, useState } from 'react';

export const useServerClock = () => {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const syncServerTime = async () => {
      try {
        const response = await fetch('/api/ntp-sync', {
          cache: 'no-store',
        });

        const data = await response.json();

        const serverTime = new Date(data.time).getTime();
        const clientTime = Date.now();

        setOffset(serverTime - clientTime);
        setNow(clientTime);
      } catch (error) {
        console.error('Failed to sync server time:', error);
      }
    };

    syncServerTime();

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (now === null) {
    return null;
  }

  return new Date(now + offset);
};
