import { createContext, useContext } from 'react';
import type { LayoutParams } from '../types/layoutParams';

export const LayoutParamsContext = createContext<LayoutParams>({});

export function useLayoutParams(): LayoutParams {
    return useContext(LayoutParamsContext);
}
