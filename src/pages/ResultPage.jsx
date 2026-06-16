/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { 
    FileDown, 
    Table, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    User, 
    TrendingUp, 
    TrendingDown,
    Search,
    Filter,
    AlertCircle,
    Play,
    BarChart3,
    List
} from 'lucide-react';
import { 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer,
    ComposedChart,
    Line,
    LabelList
} from 'recharts';
import styles from './ResultPage.module.css';
import { exportToExcel } from '../utils/excelExport';

const ResultPage = () => {
    const navigate = useNavigate();
    const [resultData, setResultData] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'amt_profit', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'result', 'allocation_result'
    const [completedPeriods, setCompletedPeriods] = useState([]);

    const [calculatedPeriod, setCalculatedPeriod] = useState({ year: '2024', month: '03' });

    useEffect(() => {
        const loadResults = async () => {
            try {
                const periods = await api.getCompletedPeriods();
                setCompletedPeriods(periods);
            } catch (err) {
                console.error("Failed to fetch completed periods", err);
            }
            try {
                const savedPeriod = await api.getStore('clinic_calculated_period');
                if (savedPeriod) {
                    setCalculatedPeriod(savedPeriod);
                    try {
                        const saved = await api.getCostingResult(savedPeriod.year, savedPeriod.month);
                        if (saved) {
                            // Handle migration from old keys if necessary
                            const migrated = (Array.isArray(saved) ? saved : []).map(item => ({
                                ...item,
                                abc_order_dept: item.abc_order_dept || item.treatDept || '-',
                                abc_oper_dept: item.abc_oper_dept || item.execDept || '-',
                                abc_order_dct: item.abc_order_dct || item.treatDoc || '-',
                                abc_oper_dct: item.abc_oper_dct || item.execDoc || '-',
                                amt_revenue: item.amt_revenue || item.revenue || 0,
                                amt_cost: item.amt_cost || item.cost || 0,
                                amt_profit: item.amt_profit !== undefined ? item.amt_profit : (item.profit || 0)
                            }));
                            setResultData(migrated);
                        }
                    } catch (e) {
                        console.error("Failed to fetch calculation results", e);
                    }
                    try {
                        const report = await api.getCostingReport(savedPeriod.year, savedPeriod.month);
                        if (report && Array.isArray(report)) {
                            setReportData(report);
                        }
                    } catch (e) {
                        console.error("Failed to fetch costing report", e);
                    }
                }
            } catch (e) {
                console.error("Failed to parse calculation results", e);
            }
            setIsLoading(false);
        };
        loadResults();
    }, []);

    // 필터 드롭다운 상태
    const [selectedYear, setSelectedYear] = useState('2024');
    const [selectedMonth, setSelectedMonth] = useState('03');

    // 계산이 완료되면 해당 기간을 드롭다운 기본값으로 자동 연동
    useEffect(() => {
        if (calculatedPeriod) {
            setSelectedYear(calculatedPeriod.year);
            setSelectedMonth(calculatedPeriod.month);
        }
    }, [calculatedPeriod]);

    const [selectedPerspective, setSelectedPerspective] = useState('abc_order_dept');
    const [selectedCostObject, setSelectedCostObject] = useState('전체');
    const [selectedSourceDept, setSelectedSourceDept] = useState('전체');
    const [selectedActivity, setSelectedActivity] = useState('전체');

    // 기간 일치 검증
    const isPeriodMatching = calculatedPeriod && String(selectedYear) === String(calculatedPeriod.year) && selectedMonth === calculatedPeriod.month;

    // 해당 관점에 맞는 선택 가능한 원가대상 동적 추출
    const availableCostObjects = useMemo(() => {
        if (!resultData || resultData.length === 0) return [];
        const uniqueSet = new Set();
        resultData.forEach(row => {
            const val = row[selectedPerspective];
            if (val && val !== '-') {
                uniqueSet.add(val);
            }
        });
        return Array.from(uniqueSet).sort();
    }, [resultData, selectedPerspective]);

    // 배부부서 목록 동적 추출 (reportData에서 추출)
    const availableSourceDepts = useMemo(() => {
        if (!reportData || reportData.length === 0) return [];
        const uniqueSet = new Set();
        reportData.forEach(row => {
            if (row.dept) uniqueSet.add(row.dept);
        });
        return Array.from(uniqueSet).sort();
    }, [reportData]);

    // 활동(계정) 목록 동적 추출 (reportData에서 추출)
    const availableActivities = useMemo(() => {
        if (!reportData || reportData.length === 0) return [];
        const uniqueSet = new Set();
        reportData.forEach(row => {
            if (row.activity_name) uniqueSet.add(row.activity_name);
        });
        return Array.from(uniqueSet).sort();
    }, [reportData]);

    // 원가대상 목록이 바뀔 때 기본적으로 이전 선택값이 없으면 '전체'로 복구/유지
    useEffect(() => {
        if (selectedCostObject !== '전체' && !availableCostObjects.includes(selectedCostObject)) {
            setSelectedCostObject('전체');
        }
    }, [availableCostObjects, selectedCostObject]);

    // 배부부서 목록이 바뀔 때 기본적으로 이전 선택값이 없으면 '전체'로 복구/유지
    useEffect(() => {
        if (selectedSourceDept !== '전체' && !availableSourceDepts.includes(selectedSourceDept)) {
            setSelectedSourceDept('전체');
        }
    }, [availableSourceDepts, selectedSourceDept]);

    // 활동 목록이 바뀔 때 기본적으로 이전 선택값이 없으면 '전체'로 복구/유지
    useEffect(() => {
        if (selectedActivity !== '전체' && !availableActivities.includes(selectedActivity)) {
            setSelectedActivity('전체');
        }
    }, [availableActivities, selectedActivity]);

    // 선택된 원가대상에 배부된 세부 내역 집계 (4열 형태)
    const allocationBreakdown = useMemo(() => {
        if (!isPeriodMatching || !reportData || reportData.length === 0) {
            return { items: [], total: 0 };
        }

        const breakdownMap = {};
        let totalSum = 0;

        // 필터 조건에 부합하는 모든 대상 및 비용 행 집계
        reportData.forEach(row => {
            const targetName = row[selectedPerspective] || '-';
            
            // '원가대상' 필터 적용 ('전체'가 아닌 경우 특정 대상 매칭)
            if (selectedCostObject !== '전체' && targetName !== selectedCostObject) {
                return;
            }

            const sourceDept = row.dept || '';
            const sourceActivity = row.activity_name || '';
            const amount = row.cost || 0;
                
            // '부서' 필터 적용 ('전체'가 아닌 경우 특정 부서 매칭)
            if (selectedSourceDept !== '전체' && sourceDept !== selectedSourceDept) {
                return;
            }

            // '활동(계정)' 필터 적용 ('전체'가 아닌 경우 특정 활동 매칭)
            if (selectedActivity !== '전체' && sourceActivity !== selectedActivity) {
                return;
            }

            // 집계 키 생성 (원가대상 | 부서 | 활동)
            const groupKey = `${targetName}|${sourceDept}|${sourceActivity}`;
            breakdownMap[groupKey] = (breakdownMap[groupKey] || 0) + amount;
            totalSum += amount;
        });

        // 표로 표시하기 위해 엔트리 리스트로 가공 및 정렬
        const items = Object.entries(breakdownMap)
            .map(([key, amt]) => {
                const [targetName, sourceDept, sourceActivity] = key.split('|');
                return {
                    target: targetName,
                    dept: sourceDept,
                    activity: sourceActivity,
                    amt: Math.round(amt)
                };
            })
            .sort((a, b) => b.amt - a.amt);

        return { items, total: Math.round(totalSum) };
    }, [reportData, selectedPerspective, selectedCostObject, selectedSourceDept, selectedActivity, isPeriodMatching]);

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        let items = [...resultData];
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            items = items.filter(item => 
                item.abc_order_dept.toLowerCase().includes(lowerSearch) || 
                item.abc_oper_dept.toLowerCase().includes(lowerSearch) || 
                item.abc_order_dct.toLowerCase().includes(lowerSearch) ||
                item.abc_oper_dct.toLowerCase().includes(lowerSearch)
            );
        }
        items.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return items;
    }, [resultData, sortConfig, searchTerm]);

    const totals = useMemo(() => {
        return sortedData.reduce((acc, curr) => ({
            amt_revenue: acc.amt_revenue + (curr.amt_revenue || 0),
            amt_cost: acc.amt_cost + (curr.amt_cost || 0),
            amt_profit: acc.amt_profit + (curr.amt_profit || 0)
        }), { amt_revenue: 0, amt_cost: 0, amt_profit: 0 });
    }, [sortedData]);

    const [viewPerspective, setViewPerspective] = useState('abc_order_dept');

    const perspectives = [
        { id: 'abc_order_dept', name: '진료과' },
        { id: 'abc_oper_dept', name: '시행과' },
        { id: 'abc_order_dct', name: '처방의사' },
        { id: 'abc_oper_dct', name: '시행의사' }
    ];

    const aggregatedData = useMemo(() => {
        const map = {};
        resultData.forEach(res => {
            const key = res[viewPerspective] || '-';
            if (!map[key]) map[key] = { name: key, revenue: 0, cost: 0, profit: 0 };
            map[key].revenue += (res.amt_revenue || 0);
            map[key].cost += (res.amt_cost || 0);
            map[key].profit += (res.amt_profit || 0);
        });
        return Object.values(map)
            .map(d => ({ 
                ...d, 
                profitRatio: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0,
                revenueInMillions: d.revenue / 1000000
            }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [resultData, viewPerspective]);

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className={styles.sortIcon} />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className={styles.sortIcon} /> : <ArrowDown size={14} className={styles.sortIcon} />;
    };

    const handleExport = () => {
        handleExportReport();
    };

    const handleExportReport = () => {
        if (!reportData || reportData.length === 0) return;
        const exportData = reportData.map(res => ({
            '진료과': res.abc_order_dept,
            '시행과': res.abc_oper_dept,
            '처방의사': res.abc_order_dct,
            '시행의사': res.abc_oper_dct,
            '부서': res.dept,
            '활동(계정)': res.activity_name,
            '원가': Math.trunc(res.cost)
        }));
        exportToExcel(exportData, '원가배부_검증보고서');
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h2 className={styles.title}>원가 산출 상세 결과</h2>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="ui-tab-container">
                        <button className={`ui-tab-button ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>요약</button>
                        <button className={`ui-tab-button ${activeTab === 'result' ? 'active' : ''}`} onClick={() => setActiveTab('result')}>상세결과</button>
                        <button className={`ui-tab-button ${activeTab === 'allocation_result' ? 'active' : ''}`} onClick={() => setActiveTab('allocation_result')}>원가배부결과</button>
                    </div>
                </div>
            </header>

            <div className="ui-subtitle-box">
                ABC 엔진을 통한 4대 관점 최종 원가대상 손익 리포트입니다.
            </div>

            {isLoading ? <div className={styles.emptyState}><p>로딩 중...</p></div> : resultData.length === 0 ? (
                <div className={styles.emptyState}><h3>결과가 없습니다</h3><button onClick={() => navigate('/run')}>계산하러 가기</button></div>
            ) : activeTab === 'summary' ? (
                <div className={styles.summaryContainer}>
                    <div className={styles.actions} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                        <button className="ui-btn-secondary" onClick={handleExport}>
                            <FileDown size={16} /> 다운로드
                        </button>
                    </div>
                    <div className={styles.summaryRowTop}>
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryTitle}><TrendingUp size={18} /> 손익 요약</div>
                            <div className={styles.statGrid}>
                                <div className={styles.statItem}><div className={styles.statLabel}>총 수익</div><div className={styles.statValue}>{Math.round(totals.amt_revenue).toLocaleString()}</div></div>
                                <div className={styles.statItem}><div className={styles.statLabel}>총 원가</div><div className={styles.statValue}>{Math.round(totals.amt_cost).toLocaleString()}</div></div>
                                <div className={`${styles.statItem} ${styles.profitabilityCard}`} style={{ background: '#1A365D' }}><div className={styles.statLabel}>총 손익</div><div className={styles.statValue}>{Math.round(totals.amt_profit).toLocaleString()}</div></div>
                            </div>
                        </div>
                        <div className={styles.summaryCard}>
                            <div className={styles.perspectiveSelector}>
                                {perspectives.map(p => <button key={p.id} className={`${styles.perspectiveButton} ${viewPerspective === p.id ? styles.perspectiveActive : ''}`} onClick={() => setViewPerspective(p.id)}>{p.name}</button>)}
                            </div>
                            <table className="ui-table">
                                <thead><tr><th>원가대상</th><th>수익</th><th>원가</th><th>손익</th></tr></thead>
                                <tbody>
                                    {aggregatedData.map(item => (
                                        <tr key={item.name}>
                                            <td style={{ fontWeight: 600 }}>{item.name}</td>
                                            <td className={styles.rightText}>{Math.trunc(item.revenue).toLocaleString()}</td>
                                            <td className={styles.rightText}>{Math.trunc(item.cost).toLocaleString()}</td>
                                            <td className={`${styles.rightText} ${item.profit >= 0 ? styles.positiveProfit : styles.negativeProfit}`}>{Math.trunc(item.profit).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'var(--color-bg-subtle)', fontWeight: 700 }}>
                                        <td style={{ fontWeight: 700 }}>총합계</td>
                                        <td className={styles.rightText}>{Math.trunc(totals.amt_revenue).toLocaleString()}</td>
                                        <td className={styles.rightText}>{Math.trunc(totals.amt_cost).toLocaleString()}</td>
                                        <td className={`${styles.rightText} ${totals.amt_profit >= 0 ? styles.positiveProfit : styles.negativeProfit}`}>
                                            {Math.trunc(totals.amt_profit).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'result' ? (
                <div className={styles.card}>
                    <div className={styles.actions} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
                        <button className="ui-btn-secondary" onClick={handleExport}>
                            <FileDown size={16} /> 다운로드
                        </button>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className="ui-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('abc_order_dept')}>진료과 {getSortIcon('abc_order_dept')}</th>
                                    <th onClick={() => handleSort('abc_oper_dept')}>시행과 {getSortIcon('abc_oper_dept')}</th>
                                    <th onClick={() => handleSort('abc_order_dct')}>처방의사 {getSortIcon('abc_order_dct')}</th>
                                    <th onClick={() => handleSort('abc_oper_dct')}>시행의사 {getSortIcon('abc_oper_dct')}</th>
                                    <th onClick={() => handleSort('amt_revenue')} className={styles.rightText}>수익 {getSortIcon('amt_revenue')}</th>
                                    <th onClick={() => handleSort('amt_cost')} className={styles.rightText}>원가 {getSortIcon('amt_cost')}</th>
                                    <th onClick={() => handleSort('amt_profit')} className={styles.rightText}>손익 {getSortIcon('amt_profit')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((res, i) => (
                                    <tr key={i}>
                                        <td>{res.abc_order_dept}</td>
                                        <td>{res.abc_oper_dept}</td>
                                        <td>{res.abc_order_dct}</td>
                                        <td>{res.abc_oper_dct}</td>
                                        <td className={styles.rightText}>{Math.trunc(res.amt_revenue).toLocaleString()}</td>
                                        <td className={styles.rightText}>{Math.trunc(res.amt_cost).toLocaleString()}</td>
                                        <td className={`${styles.rightText} ${res.amt_profit >= 0 ? styles.positiveProfit : styles.negativeProfit}`}>{Math.trunc(res.amt_profit).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--color-bg-subtle)', fontWeight: 700 }}>
                                    <td colSpan="4" style={{ textAlign: 'center', fontWeight: 700 }}>총합계</td>
                                    <td className={styles.rightText}>{Math.trunc(totals.amt_revenue).toLocaleString()}</td>
                                    <td className={styles.rightText}>{Math.trunc(totals.amt_cost).toLocaleString()}</td>
                                    <td className={`${styles.rightText} ${totals.amt_profit >= 0 ? styles.positiveProfit : styles.negativeProfit}`}>{Math.trunc(totals.amt_profit).toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* 상단 필터 영역 */}
                    <div className={styles.filterCard}>
                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>대상 회계 연도</label>
                            <select 
                                className={styles.selectField}
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                {Array.from(new Set(completedPeriods.map(p => p.period_year))).map(y => (
                                    <option key={y} value={y}>{y}년</option>
                                ))}
                                {completedPeriods.length === 0 && <option value="2024">2024년</option>}
                            </select>
                        </div>
                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>대상 회계 월</label>
                            <select 
                                className={styles.selectField}
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            >
                                {completedPeriods.filter(p => String(p.period_year) === String(selectedYear)).map(p => {
                                    return <option key={p.period_name} value={p.period_name}>{p.period_name.substring(5, 7)}월</option>;
                                })}
                                {completedPeriods.length === 0 && <option value="2024년03월">03월</option>}
                            </select>
                        </div>
                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>원가대상유형</label>
                            <select 
                                className={styles.selectField}
                                value={selectedPerspective}
                                onChange={(e) => setSelectedPerspective(e.target.value)}
                            >
                                <option value="abc_order_dept">진료과</option>
                                <option value="abc_oper_dept">시행과</option>
                                <option value="abc_order_dct">처방의사</option>
                                <option value="abc_oper_dct">시행의사</option>
                            </select>
                        </div>
                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>원가대상</label>
                            <select 
                                className={styles.selectField}
                                value={selectedCostObject}
                                onChange={(e) => setSelectedCostObject(e.target.value)}
                            >
                                <option value="전체">전체</option>
                                {availableCostObjects.map(obj => (
                                    <option key={obj} value={obj}>{obj}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>배부부서</label>
                            <select 
                                className={styles.selectField}
                                value={selectedSourceDept}
                                onChange={(e) => setSelectedSourceDept(e.target.value)}
                            >
                                <option value="전체">전체</option>
                                {availableSourceDepts.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>활동(계정)</label>
                            <select 
                                className={styles.selectField}
                                value={selectedActivity}
                                onChange={(e) => setSelectedActivity(e.target.value)}
                            >
                                <option value="전체">전체</option>
                                {availableActivities.map(act => (
                                    <option key={act} value={act}>{act}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 표 및 안내 영역 */}
                    {!isPeriodMatching ? (
                        <div className={styles.warningBox}>
                            <AlertCircle className={styles.warningIcon} size={24} />
                            <div>
                                <strong>선택한 기간의 원가 계산 결과가 존재하지 않습니다.</strong>
                                <br />
                                {selectedYear}년 {selectedMonth}월 데이터에 대한 원가를 산출하려면 [원가 계산 실행] 메뉴에서 먼저 계산을 진행해 주세요.
                                <br />
                                (현재 계산 완료된 기간: {calculatedPeriod.year}년 {calculatedPeriod.month}월)
                            </div>
                        </div>
                    ) : (
                        <div className={styles.card}>
                            <div className={styles.actions} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                                <h3 className={styles.resultTitle} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', color: '#1e293b' }}>
                                    <Table size={18} /> 원가 배부 결과 상세 내역
                                </h3>
                                <button className="ui-btn-secondary" onClick={handleExportReport}>
                                    <FileDown size={16} /> 다운로드
                                </button>
                            </div>
                            <div className={styles.tableWrapper}>
                                <table className="ui-table">
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', paddingLeft: '20px', cursor: 'default' }}>원가대상</th>
                                            <th style={{ textAlign: 'left', cursor: 'default' }}>부서</th>
                                            <th style={{ textAlign: 'left', cursor: 'default' }}>활동(계정)</th>
                                            <th className={styles.rightText} style={{ width: '200px', cursor: 'default' }}>금액</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allocationBreakdown.items.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className={styles.centerText} style={{ padding: '24px', color: 'var(--color-text-secondary)' }}>
                                                    배부된 원가 정보가 없습니다.
                                                </td>
                                            </tr>
                                        ) : (
                                            allocationBreakdown.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ textAlign: 'left', paddingLeft: '20px', fontWeight: 600 }}>{item.target}</td>
                                                    <td style={{ textAlign: 'left' }}>{item.dept}</td>
                                                    <td style={{ textAlign: 'left', color: 'var(--color-text-secondary)' }}>{item.activity}</td>
                                                    <td className={styles.rightText}>{item.amt.toLocaleString()}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className={styles.totalRow} style={{ background: 'var(--color-bg-subtle)', fontWeight: 700 }}>
                                            <td colSpan="3" style={{ textAlign: 'left', paddingLeft: '20px' }}>총합계</td>
                                            <td className={styles.rightText}>{allocationBreakdown.total.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ResultPage;
