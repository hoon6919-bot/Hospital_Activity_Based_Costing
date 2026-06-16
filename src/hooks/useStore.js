import { useState, useEffect } from 'react';
import { api } from '../api';

export function useStore(key, defaultValue) {
    const [data, setData] = useState(defaultValue);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        api.getStore(key).then(val => {
            if (isMounted) {
                if (val !== null && val !== undefined) {
                    setData(val);
                }
                setIsLoading(false);
            }
        }).catch(err => {
            console.error(`Error loading store ${key}:`, err);
            if (isMounted) setIsLoading(false);
        });

        return () => { isMounted = false; };
    }, [key]);

    const saveData = async (newData) => {
        setData(newData);
        try {
            await api.saveStore(key, newData);
        } catch (err) {
            console.error(`Error saving store ${key}:`, err);
        }
    };

    return [data, saveData, isLoading];
}
