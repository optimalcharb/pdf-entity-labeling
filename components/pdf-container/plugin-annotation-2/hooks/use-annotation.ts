import { useCapability, usePlugin } from '@embedpdf/core/react';
import { AnnotationPlugin, AnnotationState, initialState } from '@embedpdf/plugin-annotation';
import { useState, useEffect } from 'react';

export const useAnnotationPlugin = () => usePlugin<AnnotationPlugin>(AnnotationPlugin.id);
export const useAnnotationCapability = () => useCapability<AnnotationPlugin>(AnnotationPlugin.id);

export const useAnnotation = () => {
  const { provides } = useAnnotationCapability();
  const [state, setState] = useState<AnnotationState>(initialState({ enabled: true }));

  useEffect(() => {
    return provides?.onStateChange((action) => {
      setState(action);
    });
  }, [provides]);

  return {
    state,
    provides,
  };
};
