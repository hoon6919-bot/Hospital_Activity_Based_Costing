/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useMemo, useEffect, useContext } from 'react';
import { useStore } from '../hooks/useStore';
import { Plus, Trash2, Save, BarChart3, List, FileDown, Upload, FileSpreadsheet } from 'lucide-react';
import { ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LabelList, PieChart, Pie, Cell } from 'recharts';
import styles from './CostPage.module.css';
import { exportToExcel, importFromExcel } from '../utils/excelExport';
import { PeriodContext } from '../contexts/PeriodContext';

const CostPage = () => {
    const { currentPeriod, isPeriodLoading } = useContext(PeriodContext);
    
    const [activeTab, setActiveTab] = useState('input');
    const [expenseData, setExpenseData] = useState([]);
    const [availableDepts, setAvailableDepts] = useState([]);
    const [standardAccounts, setStandardAccounts] = useState([]);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const fileInputRef = React.useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    // Global Stores
    // Removed Global Stores: Fetch from API directly instead
    const [laborData, setLaborData] = useState([]);
    const [revenueData, setRevenueData] = useState([]);

    useEffect(() => {
        let isMounted = true;
        import('../api').then(({ api }) => {
            if (!isMounted) return;
            Promise.all([
                api.getDepartments(),
                api.getStandardAccounts()
            ]).then(([depts, accounts]) => {
                if (depts && depts.length > 0) setAvailableDepts(depts.map(d => d.name));
                else setAvailableDepts(['정형외과', '외래검사실', '영상의학과', '물리치료실', '정형1', '정형2', '정형3', '정형4']);

                if (accounts && accounts.length > 0) {
                    setStandardAccounts(accounts);
                } else {
                    setStandardAccounts([
                        { id: 'a1', account_type: '의료수익', account_name: '외래수익' },
                        { id: 'a2', account_type: '의료수익', account_name: '입원수익' },
                        { id: 'a3', account_type: '의료비용', account_name: '인건비' },
                        { id: 'a4', account_type: '의료비용', account_name: '재료비' },
                        { id: 'a5', account_type: '의료비용', account_name: '상각비' },
                        { id: 'a6', account_type: '의료비용', account_name: '관리비' },
                        { id: 'a7', account_type: '의료외수익', account_name: '의료외수익' },
                        { id: 'a8', account_type: '의료외비용', account_name: '의료외비용' }
                    ]);
                }
            });
        });
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        if (isPeriodLoading) return;
        if (!currentPeriod) {
            setExpenseData([]);
            setLaborData([]);
            setRevenueData([]);
            return;
        }
        setIsLoading(true);
        import('../api').then(({ api }) => {
            Promise.all([
                api.getExpenseData(currentPeriod.period_year, currentPeriod.period_name).catch(() => []),
                api.getPayment(currentPeriod.period_year, currentPeriod.period_name).catch(() => []),
                api.getRevenueData(currentPeriod.period_year, currentPeriod.period_name).catch(() => [])
            ]).then(([exp, lab, rev]) => {
                setExpenseData(exp || []);
                setLaborData(lab || []);
                setRevenueData(rev || []);
            }).catch(err => {
                console.error('Failed to fetch data:', err);
                setExpenseData([]);
                setLaborData([]);
                setRevenueData([]);
            }).finally(() => setIsLoading(false));
        });
    }, [currentPeriod]);

    const handleSave = () => {
        if (!currentPeriod) return alert("회계기간을 먼저 선택해주세요.");
        import('../api').then(({ api }) => {
            api.saveExpenseData(currentPeriod.period_year, currentPeriod.period_name, expenseData)
                .then(() => alert('저장되었습니다.'))
                .catch(err => alert('저장 중 오류가 발생했습니다: ' + err.message));
        });
    };

    const handleDownloadTemplate = () => {
        setIsDownloadModalOpen(false);
        const templateData = [{
            '부서': availableDepts[0] || '정형외과',
            '계정분류': uniqueAccountCategories[0] || '의료비용',
            '계정명': standardAccounts[0]?.account_name || '급여',
            '투입여부': 'Y',
            '금액': 0,
            '비고': ''
        }];
        exportToExcel(templateData, '비용전표_업로드양식');
    };

    const handleDownloadData = () => {
        setIsDownloadModalOpen(false);
        const exportData = expenseData.map((row, index) => ({
            'NO': index + 1,
            '부서': row.dept,
            '계정분류': row.account_category,
            '계정명': row.account_name,
            '투입여부': row.costing_yn,
            '금액': row.amount,
            '비고': row.note
        }));
        exportToExcel(exportData, `비용전표_${currentPeriod?.period_year}_${currentPeriod?.period_name}`);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await importFromExcel(file);
            if (data && data.length > 0) {
                const invalidValues = [];
                const mappedData = data.map((row, idx) => {
                    const dept = row.dept || row.dept_name || row.부서 || availableDepts[0] || '';
                    const acc_cat = row.account_category || row.category || row.accCategory || row.계정분류 || '';
                    const acc_name = row.account_name || row.account || row.계정명 || '';
                    const costing_yn = row.costing_yn || row.투입여부 || 'Y';

                    if (dept && !availableDepts.includes(dept)) invalidValues.push(dept);
                    
                    const isAccNameValid = standardAccounts.some(acc => acc.account_name === acc_name);
                    if (acc_name && !isAccNameValid) invalidValues.push(acc_name);

                    return {
                        id: Date.now() + idx,
                        period_year: currentPeriod?.period_year,
                        period_type: currentPeriod?.period_type,
                        period_name: currentPeriod?.period_name,
                        dept: dept,
                        account_category: acc_cat,
                        account_name: acc_name,
                        costing_yn: costing_yn,
                        amount: Number(row.amount || row.금액 || row.총금액 || 0),
                        note: row.note || row.비고 || ''
                    };
                });

                if (invalidValues.length > 0) {
                    const uniqueInvalids = [...new Set(invalidValues)].join(', ');
                    alert(`사용할 수 없는 부서/계정 등 코드입니다: (${uniqueInvalids})`);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    return;
                }

                setExpenseData(mappedData);
                alert(`선택된 기간에 ${mappedData.length}건의 데이터를 불러왔습니다.\n[저장] 버튼을 눌러주세요.`);
            } else {
                alert("불러올 데이터가 없습니다. 양식을 확인해주세요.");
            }
        } catch (err) {
            console.error(err);
            alert("파일 읽기 오류가 발생했습니다.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddRow = () => {
        const newRow = {
            id: Date.now(),
            period_year: currentPeriod?.period_year,
            period_type: currentPeriod?.period_type,
            period_name: currentPeriod?.period_name,
            dept: availableDepts[0] || '',
            account_category: uniqueAccountCategories[0] || '',
            account_name: standardAccounts[0]?.account_name || '',
            costing_yn: 'Y',
            amount: 0,
            note: ''
        };
        setExpenseData([newRow, ...expenseData]);
    };

    const handleDeleteRow = (id) => {
        if(window.confirm('삭제하시겠습니까?')) {
            setExpenseData(expenseData.filter(r => r.id !== id));
        }
    };

    const updateRow = (id, field, value) => {
        setExpenseData(expenseData.map(r => {
            if (r.id === id) {
                return { ...r, [field]: value };
            }
            return r;
        }));
    };

    // 계정분류 목록 (표준코드 기반)
    const uniqueAccountCategories = useMemo(() => {
        return [...new Set(standardAccounts.map(a => a.account_type || a.account_category).filter(Boolean))];
    }, [standardAccounts]);



    const totalAmount = useMemo(() => {
        return expenseData.reduce((sum, r) => {
            const amount = Number(r.amount) || 0;
            const cat = r.account_category || '';
            if (cat.includes('수익')) {
                return sum + amount;
            } else if (cat.includes('비용') || cat === '관리운영비') {
                return sum - amount;
            }
            return sum - amount; // default cost assumption
        }, 0);
    }, [expenseData]);

    const verificationData = useMemo(() => {
        // 비교 1: 회계전표(expense)의 인건비 금액 vs 인건비 화면(labor)의 인건비 금액
        const expLaborTotal = expenseData.filter(r => r.account_category === '의료비용' && r.account_name?.includes('인건비'))
                                         .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const laborScreenTotal = laborData.reduce((sum, r) => sum + (Number(r.total_amount) || Number(r.amount) || 0), 0);
        
        let laborDiff = Math.abs(expLaborTotal - laborScreenTotal);
        let laborRatio = Math.abs(expLaborTotal) > 0 ? (laborDiff / Math.abs(expLaborTotal)) * 100 : 0;
        if(expLaborTotal === 0 && laborScreenTotal === 0) laborRatio = 0;

        // 비교 2: 회계전표(expense)의 수익 계정명 금액 vs 수익 화면(revenue)의 금액
        const expRevTotal = expenseData.filter(r => r.account_category?.includes('수익'))
                                       .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const revScreenTotal = revenueData.reduce((sum, r) => sum + (Number(r.total_amount) || Number(r.amount) || Number(r.amt) || 0), 0);
        
        let revDiff = Math.abs(expRevTotal - revScreenTotal);
        let revRatio = Math.abs(expRevTotal) > 0 ? (revDiff / Math.abs(expRevTotal)) * 100 : 0;
        if(expRevTotal === 0 && revScreenTotal === 0) revRatio = 0;

        const getStatus = (ratio) => {
            if (ratio >= 10) return { text: '차이 소명필요', color: '#ff4d4f' };
            if (ratio >= 5) return { text: '확인 필요', color: '#faad14' };
            if (ratio > 1) return { text: '적정', color: '#52c41a' };
            return { text: 'OK', color: '#1890ff' };
        };

        return [
            {
                name: '인건비',
                expenseVal: expLaborTotal,
                screenVal: laborScreenTotal,
                diff: laborDiff,
                ratio: laborRatio,
                status: getStatus(laborRatio)
            },
            {
                name: '수익',
                expenseVal: expRevTotal,
                screenVal: revScreenTotal,
                diff: revDiff,
                ratio: revRatio,
                status: getStatus(revRatio)
            }
        ];
    }, [expenseData, laborData, revenueData]);

    const dashboardData = useMemo(() => {
        let totalRevenue = 0;
        let totalCost = 0;
        
        const accMap = {};
        const deptMap = {};
        const costNamesMap = {};

        expenseData.forEach(r => {
            const amount = Number(r.amount) || 0;
            const cat = r.account_category || '기타';
            const accName = r.account_name || '기타';
            const dept = r.dept || '기타';

            const isRev = cat.includes('수익');
            const isCost = cat.includes('비용') || cat === '관리운영비';

            if (isRev) totalRevenue += amount;
            if (isCost) {
                totalCost += amount;
                
                if (!deptMap[dept]) deptMap[dept] = 0;
                deptMap[dept] += amount;

                if (!costNamesMap[accName]) costNamesMap[accName] = 0;
                costNamesMap[accName] += amount;
            }

            const key = `${cat}_${accName}`;
            if (!accMap[key]) {
                accMap[key] = { category: cat, name: accName, amount: 0, isRev };
            }
            accMap[key].amount += amount;
        });

        const netProfit = totalRevenue - totalCost;
        const profitRatio = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        const accountDetails = Object.values(accMap).sort((a, b) => b.amount - a.amount).map(item => ({
            ...item,
            ratio: item.isRev ? '-' : (totalRevenue > 0 ? ((item.amount / totalRevenue) * 100).toFixed(1) + '%' : '-')
        }));

        const deptCostDetails = Object.entries(deptMap).map(([dept, amount]) => ({
            dept,
            amount,
            ratio: totalCost > 0 ? ((amount / totalCost) * 100).toFixed(1) + '%' : '0%'
        })).sort((a, b) => b.amount - a.amount);

        const costRatioChartData = [{ name: '비용' }];
        Object.entries(costNamesMap).forEach(([name, amount]) => {
            costRatioChartData[0][name] = totalCost > 0 ? Number(((amount / totalCost) * 100).toFixed(1)) : 0;
        });
        const costNames = Object.keys(costNamesMap).sort((a,b) => costNamesMap[b] - costNamesMap[a]);

        return {
            totalRevenue,
            totalCost,
            netProfit,
            profitRatio,
            accountDetails,
            deptCostDetails,
            costRatioChartData,
            costNames
        };
    }, [expenseData]);

    if (isPeriodLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <div className={styles.loading}>회계기간 정보를 불러오는 중입니다...</div>
                </div>
            </div>
        );
    }

    if (!currentPeriod) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <h2>회계기간이 선택되지 않았습니다.</h2>
                    <p>우측 상단에서 회계기간을 먼저 선택해주세요.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h2 className={styles.title}>비용(회계전표)</h2>
                </div>
                <div className="ui-tab-container">
                    <button 
                        className={`ui-tab-button ${activeTab === 'input' ? 'active' : ''}`}
                        onClick={() => setActiveTab('input')}
                    >
                        <List size={18} /> 데이터 입력
                    </button>
                    <button 
                        className={`ui-tab-button ${activeTab === 'summary' ? 'active' : ''}`}
                        onClick={() => setActiveTab('summary')}
                    >
                        <BarChart3 size={18} /> 데이터 요약
                    </button>
                </div>
            </header>

            <div className="ui-subtitle-box">
                비용 데이터 및 원가 분석을 위한 회계전표를 관리합니다.<br />
                {activeTab === 'input' && (
                    <>- 부서, 계정분류, 계정명, 투입여부(Y/N) 등의 전표 내역을 입력합니다.</>
                )}
            </div>

            <div className={styles.content}>
                {isLoading ? (
                    <div className={styles.loading}>데이터를 불러오는 중입니다...</div>
                ) : activeTab === 'input' ? (
                    <div className={styles.card}>
                        <div className={styles.actions} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
                            <button className="ui-btn-secondary" onClick={handleAddRow}>
                                <Plus size={16} /> 추가
                            </button>
                            <button className="ui-btn-primary" onClick={handleSave}>
                                <Save size={16} /> 저장
                            </button>
                            <button className="ui-btn-secondary" onClick={() => setIsDownloadModalOpen(true)}>
                                <FileDown size={16} /> 다운로드
                            </button>
                            <button className="ui-btn-secondary" onClick={() => fileInputRef.current?.click()}>
                                <Upload size={16} /> 업로드
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" style={{ display: 'none' }} />
                        </div>
                        <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>부서</th>
                                    <th>계정분류</th>
                                    <th>계정명</th>
                                    <th>투입여부</th>
                                    <th>총금액</th>
                                    <th>비고</th>
                                    <th>삭제</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenseData.map(row => (
                                    <tr key={row.id}>
                                        <td>
                                            <select 
                                                className={styles.select}
                                                style={{ width: '100%' }}
                                                value={row.dept || ''} 
                                                onChange={(e) => updateRow(row.id, 'dept', e.target.value)}
                                            >
                                                <option value="">-선택-</option>
                                                {availableDepts.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                                {row.dept && !availableDepts.includes(row.dept) && (
                                                    <option value={row.dept}>{row.dept}</option>
                                                )}
                                            </select>
                                        </td>
                                        <td>
                                            <select 
                                                className={styles.select}
                                                style={{ width: '100%' }}
                                                value={row.account_category || ''} 
                                                onChange={(e) => updateRow(row.id, 'account_category', e.target.value)}
                                            >
                                                <option value="">분류 선택</option>
                                                {uniqueAccountCategories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <select 
                                                className={styles.select}
                                                style={{ width: '100%' }}
                                                value={row.account_name || ''} 
                                                onChange={(e) => {
                                                    const selectedAcc = standardAccounts.find(a => a.account_name === e.target.value);
                                                    setExpenseData(expenseData.map(r => 
                                                        r.id === row.id ? { ...r, account_name: e.target.value, account_category: selectedAcc?.account_type || selectedAcc?.account_category || r.account_category } : r
                                                    ));
                                                }}
                                            >
                                                <option value="">계정 선택</option>
                                                {standardAccounts
                                                    .filter(acc => !row.account_category || (acc.account_type || acc.account_category) === row.account_category)
                                                    .map(acc => (
                                                        <option key={acc.id || acc.account_name} value={acc.account_name}>{acc.account_name}</option>
                                                    ))}
                                            </select>
                                        </td>
                                        <td>
                                            <select 
                                                className={styles.select}
                                                value={row.costing_yn || 'Y'} 
                                                onChange={(e) => updateRow(row.id, 'costing_yn', e.target.value)}
                                                style={{ width: '100%' }}
                                            >
                                                <option value="Y">Y (투입)</option>
                                                <option value="N">N (제외)</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input 
                                                className={styles.input}
                                                type="text" 
                                                value={(row.amount || 0).toLocaleString()} 
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                    updateRow(row.id, 'amount', parseInt(val, 10) || 0);
                                                }}
                                                style={{ width: '100%', textAlign: 'right' }}
                                            />
                                        </td>
                                        <td>
                                            <input 
                                                className={styles.input}
                                                type="text" 
                                                value={row.note || ''} 
                                                onChange={(e) => updateRow(row.id, 'note', e.target.value)}
                                                style={{ width: '100%' }}
                                                placeholder="비고 입력"
                                            />
                                        </td>
                                        <td className={styles.actionCell}>
                                            <button className={styles.iconBtn} onClick={() => handleDeleteRow(row.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {expenseData.length > 0 && (
                                <tfoot>
                                    <tr className={styles.totalRow}>
                                        <td colSpan="4" style={{textAlign: 'center', fontWeight: 'bold'}}>당기순이익</td>
                                        <td style={{textAlign: 'right', fontWeight: 'bold'}}>
                                            {totalAmount.toLocaleString()}
                                        </td>
                                        <td colSpan="2"></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                        </div>
                    </div>
                ) : (
                    <div className={styles.summaryContainer}>
                        {/* 1st Row */}
                        <div className={styles.summaryRowTop}>
                            {/* 손익 현황 요약 */}
                            <div className={styles.summaryCard}>
                                <div className={styles.summaryTitle}>손익 현황 요약</div>
                                <div className={styles.cardContent} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>총 의료수익 (+)</div>
                                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dashboardData.totalRevenue.toLocaleString()}원</div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>총 의료비용 (-)</div>
                                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dashboardData.totalCost.toLocaleString()}원</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ flex: 2, background: '#1A365D', color: 'white', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.8 }}>의료이익 (수익 - 비용)</div>
                                            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboardData.netProfit > 0 ? '+' : ''}{dashboardData.netProfit.toLocaleString()}원</div>
                                        </div>
                                        <div style={{ flex: 1, background: '#3B82F6', color: 'white', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.8 }}>수익률</div>
                                            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboardData.profitRatio.toFixed(0)}%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 계정 분류별 금액 */}
                            <div className={styles.summaryCard}>
                                <div className={styles.summaryTitle}>계정 분류별 금액</div>
                                <div className={styles.cardContent}>
                                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                        <table className="ui-table">
                                            <thead>
                                                <tr>
                                                    <th style={{position:'sticky', top:0, zIndex:1}}>계정 분류</th>
                                                    <th style={{position:'sticky', top:0, zIndex:1}}>계정</th>
                                                    <th style={{position:'sticky', top:0, zIndex:1}}>금액</th>
                                                    <th style={{position:'sticky', top:0, zIndex:1}}>수익 대비 원가</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dashboardData.accountDetails.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td>{item.category}</td>
                                                        <td>{item.name}</td>
                                                        <td style={{textAlign: 'right'}}>{item.amount.toLocaleString()}</td>
                                                        <td style={{textAlign: 'center'}}>{item.ratio}</td>
                                                    </tr>
                                                ))}
                                                <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                                                    <td colSpan="2" style={{textAlign: 'center'}}>의료손익</td>
                                                    <td style={{textAlign: 'right'}}>{dashboardData.netProfit.toLocaleString()}</td>
                                                    <td style={{textAlign: 'center'}}>-</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2nd Row */}
                        <div className={styles.summaryRowTop}>
                            {/* 부서별 비용 현황 */}
                            <div className={styles.summaryCard}>
                                <div className={styles.summaryTitle}>부서별 비용 현황</div>
                                <div className={styles.cardContent}>
                                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                        <table className="ui-table">
                                            <thead>
                                                <tr>
                                                    <th style={{position:'sticky', top:0, zIndex:1}}>부서명</th>
                                                    <th style={{position:'sticky', top:0, zIndex:1}}>비용</th>
                                                    <th style={{position:'sticky', top:0, zIndex:1}}>비중</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dashboardData.deptCostDetails.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td>{item.dept}</td>
                                                        <td style={{textAlign: 'right'}}>{item.amount.toLocaleString()}</td>
                                                        <td style={{textAlign: 'center'}}>{item.ratio}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* 수익 대비 비용 비율 */}
                            <div className={styles.summaryCard}>
                                <div className={styles.summaryTitle}>수익 대비 비용 비율</div>
                                <div className={styles.cardContent} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: '100%', height: '150px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                layout="vertical"
                                                data={dashboardData.costRatioChartData}
                                                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                                            >
                                                <XAxis type="number" hide domain={[0, 100]} />
                                                <YAxis dataKey="name" type="category" hide />
                                                <Tooltip formatter={(val) => val + '%'} />
                                                <Legend iconType="square" wrapperStyle={{ paddingTop: '20px' }} />
                                                {dashboardData.costNames.map((name, index) => (
                                                    <Bar key={name} dataKey={name} stackId="a" fill={['#1A365D', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#EF4444', '#14B8A6'][index % 8]}>
                                                        <LabelList dataKey={name} position="center" fill="#ffffff" fontSize={12} formatter={(val) => val > 0 ? `${val}%` : ''} />
                                                    </Bar>
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3rd Row - Verification */}
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryTitle}>회계전표 금액검증</div>
                            <div className={styles.cardContent}>
                                <table className="ui-table">
                                    <thead>
                                        <tr>
                                            <th>항목</th>
                                            <th>회계전표 금액 (A)</th>
                                            <th>상세화면 금액 (B)</th>
                                            <th>차이 금액 (|A-B|)</th>
                                            <th>차이 비율</th>
                                            <th>검증 상태</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {verificationData.map((v, i) => (
                                            <tr key={i}>
                                                <td>{v.name}</td>
                                                <td style={{textAlign:'right'}}>{v.expenseVal.toLocaleString()}</td>
                                                <td style={{textAlign:'right'}}>{v.screenVal.toLocaleString()}</td>
                                                <td style={{textAlign:'right'}}>{v.diff.toLocaleString()}</td>
                                                <td style={{textAlign:'right'}}>{v.ratio.toFixed(2)}%</td>
                                                <td style={{textAlign:'center', fontWeight:'bold', color: v.status.color}}>
                                                    {v.status.text}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className={styles.helpText} style={{marginTop: '15px'}}>
                                    * <strong>차이 비율 기준:</strong> 1% 이하(OK), 1~5%(적정), 5~10%(확인 필요), 10% 이상(차이 소명필요)<br/>
                                    * 투입여부(Y/N): 비용 전표의 금액 대신 인건비 등 상세 화면의 금액을 원가계산에 직접 사용하고자 할 경우 전표의 투입여부를 'N'으로 설정합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isDownloadModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '320px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>다운로드 선택</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={handleDownloadTemplate}
                                style={{ padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 600 }}
                            >
                                <FileSpreadsheet size={18} color="#3b82f6" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>업로드 양식 다운로드</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>빈 엑셀 양식 포맷</div>
                                </div>
                            </button>
                            <button
                                onClick={handleDownloadData}
                                style={{ padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 600 }}
                            >
                                <FileDown size={18} color="#10b981" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>비용 데이터 다운로드</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>현재 입력된 데이터 전체</div>
                                </div>
                            </button>
                        </div>
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setIsDownloadModalOpen(false)}
                                style={{ padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 600 }}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CostPage;
