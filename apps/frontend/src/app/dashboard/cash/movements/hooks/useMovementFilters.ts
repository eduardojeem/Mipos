import { useReducer, Dispatch } from 'react';

export interface MovementFilters {
    type: string;
    from: string;
    to: string;
    search: string;
    amountMin: string;
    amountMax: string;
    referenceType: string;
    userId: string;
}

type FilterAction =
    | { type: 'SET_TYPE'; payload: string }
    | { type: 'SET_FROM'; payload: string }
    | { type: 'SET_TO'; payload: string }
    | { type: 'SET_SEARCH'; payload: string }
    | { type: 'SET_AMOUNT_MIN'; payload: string }
    | { type: 'SET_AMOUNT_MAX'; payload: string }
    | { type: 'SET_REFERENCE_TYPE'; payload: string }
    | { type: 'SET_USER_ID'; payload: string }
    | { type: 'CLEAR_ALL' };

const initialFilters: MovementFilters = {
    type: 'all',
    from: '',
    to: '',
    search: '',
    amountMin: '',
    amountMax: '',
    referenceType: 'all',
    userId: 'all',
};

function filterReducer(state: MovementFilters, action: FilterAction): MovementFilters {
    switch (action.type) {
        case 'SET_TYPE':
            return { ...state, type: action.payload };
        case 'SET_FROM':
            return { ...state, from: action.payload };
        case 'SET_TO':
            return { ...state, to: action.payload };
        case 'SET_SEARCH':
            return { ...state, search: action.payload };
        case 'SET_AMOUNT_MIN':
            return { ...state, amountMin: action.payload };
        case 'SET_AMOUNT_MAX':
            return { ...state, amountMax: action.payload };
        case 'SET_REFERENCE_TYPE':
            return { ...state, referenceType: action.payload };
        case 'SET_USER_ID':
            return { ...state, userId: action.payload };
        case 'CLEAR_ALL':
            return initialFilters;
        default:
            return state;
    }
}

export interface UseMovementFiltersReturn {
    filters: MovementFilters;
    dispatch: Dispatch<FilterAction>;
    setType: (value: string) => void;
    setFrom: (value: string) => void;
    setTo: (value: string) => void;
    setSearch: (value: string) => void;
    setAmountMin: (value: string) => void;
    setAmountMax: (value: string) => void;
    setReferenceType: (value: string) => void;
    setUserId: (value: string) => void;
    clearAll: () => void;
}

/**
 * Shared hook for managing movement filters
 * Uses useReducer for better performance with multiple filter states
 */
export function useMovementFilters(initial?: Partial<MovementFilters>): UseMovementFiltersReturn {
    const [filters, dispatch] = useReducer(filterReducer, { ...initialFilters, ...initial });

    const setType = (value: string) => dispatch({ type: 'SET_TYPE', payload: value });
    const setFrom = (value: string) => dispatch({ type: 'SET_FROM', payload: value });
    const setTo = (value: string) => dispatch({ type: 'SET_TO', payload: value });
    const setSearch = (value: string) => dispatch({ type: 'SET_SEARCH', payload: value });
    const setAmountMin = (value: string) => dispatch({ type: 'SET_AMOUNT_MIN', payload: value });
    const setAmountMax = (value: string) => dispatch({ type: 'SET_AMOUNT_MAX', payload: value });
    const setReferenceType = (value: string) => dispatch({ type: 'SET_REFERENCE_TYPE', payload: value });
    const setUserId = (value: string) => dispatch({ type: 'SET_USER_ID', payload: value });
    const clearAll = () => dispatch({ type: 'CLEAR_ALL' });

    return {
        filters,
        dispatch,
        setType,
        setFrom,
        setTo,
        setSearch,
        setAmountMin,
        setAmountMax,
        setReferenceType,
        setUserId,
        clearAll,
    };
}
