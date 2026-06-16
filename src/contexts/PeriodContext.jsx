import React, { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export const PeriodContext = createContext();

export const PeriodProvider = ({ children }) => {
    const [currentPeriod, setCurrentPeriod] = useState(null);
    const [isPeriodLoading, setIsPeriodLoading] = useState(true);
    const [periods, setPeriods] = useState([]);           // 전체 원가계산 기간 목록
    const [isPeriodsLoading, setIsPeriodsLoading] = useState(true);
    const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false); // Footer 클릭 시 열리는 모달

    // 현재 선택된 기간 로드
    useEffect(() => {
        const loadPeriod = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setIsPeriodLoading(false);
                return;
            }
            try {
                const data = await api.getPeriod();
                if (data && (data.period_year || data.period_name)) {
                    setCurrentPeriod(data);
                } else {
                    setCurrentPeriod({ period_year: 2026, period_type: '월별', period_name: '3월' });
                }
            } catch (err) {
                console.error("Failed to load period", err);
                setCurrentPeriod({ period_year: 2026, period_type: '월별', period_name: '3월' });
            } finally {
                setIsPeriodLoading(false);
            }
        };
        loadPeriod();
    }, []);

    // 전체 기간 목록 로드
    const loadPeriods = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setIsPeriodsLoading(false);
            return;
        }
        try {
            setIsPeriodsLoading(true);
            const data = await api.getPeriods();
            setPeriods(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load periods", err);
            setPeriods([]);
        } finally {
            setIsPeriodsLoading(false);
        }
    }, []);

    useEffect(() => { loadPeriods(); }, [loadPeriods]);

    // 현재 기간 변경 (Footer 팝업에서 선택)
    const changePeriod = async (newPeriod) => {
        setCurrentPeriod(newPeriod);
        await api.savePeriod(newPeriod);
    };

    return (
        <PeriodContext.Provider value={{
            currentPeriod,
            changePeriod,
            isPeriodLoading,
            periods,
            isPeriodsLoading,
            loadPeriods,
            isPeriodModalOpen,
            setIsPeriodModalOpen,
        }}>
            {children}
        </PeriodContext.Provider>
    );
};
