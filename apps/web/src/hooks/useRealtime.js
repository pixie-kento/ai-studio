import { useEffect, useRef } from 'react';
import pb from '../lib/pocketbase.js';

export function useRealtime(collection, filter, onEvent) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    if (!collection) return;
    let unsubscribe = null;

    pb.collection(collection).subscribe(filter || '*', (e) => {
      callbackRef.current?.(e);
    }).then((unsub) => {
      unsubscribe = unsub;
    }).catch((err) => {
      console.warn('[useRealtime] Subscribe error:', err.message);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [collection, filter]);
}

export default useRealtime;
