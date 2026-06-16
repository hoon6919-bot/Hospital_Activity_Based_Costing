import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Plus, Trash2, Save, FileDown, Upload, FileSpreadsheet } from 'lucide-react';
import styles from './LaborInputPage.module.css';
import { api } from '../api';
import { exportToExcel, importFromExcel } from '../utils/excelExport';
import { PeriodContext } from '../contexts/PeriodContext';

const LaborInputPage = () => {
    const { currentPeriod, isPeriodLoading } = useContext(PeriodContext);
    
    const [availableDepts, setAvailableDepts] = useState([]);
    const [jobCategories, setJobCategories] = useState([]);
    const [standardAccounts, setStandardAccounts] = useState([]);
    const [laborData, setLaborData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const fileInputRef = React.useRef(null);

    const uniqueAccountCategories = useMemo(() => {
        return [...new Set(standardAccounts.map(a => a.account_type).filter(Boolean))];
    }, [standardAccounts]);

    useEffect(() => {
        if (isPeriodLoading || !currentPeriod) return;

        const loadData = async () => {
            try {
                setIsLoading(true);
                
                // Load Departments (only is_dept === 1)
                const depts = await api.getDepartments();
                let filteredDepts = depts.filter(d => d.is_dept === 1).map(d => d.name);
                if (filteredDepts.length === 0) {
                    filteredDepts = ['정형1', '정형2', '정형3', '정형4', '정형외과', '외래검사실', '원무팀', '행정팀'];
                }
                setAvailableDepts(filteredDepts);

                // Load Job Types
                const jobs = await api.getStandardJobs();
                let jobNames = jobs.map(j => j.job_name);
                if (jobNames.length === 0) {
                    jobNames = ['의사직', '간호직', '보건직', '행정직', '기타직'];
                }
                setJobCategories(jobNames);

                // Load Standard Accounts
                const accounts = await api.getStandardAccounts();
                setStandardAccounts(accounts || []);

                // Default fallbacks for Labor Page
                const defaultMedicalExpenses = accounts.filter(a => a.account_type === '의료비용');
                const uniqueCategoriesArray = [...new Set(accounts.map(a => a.account_type).filter(Boolean))];
                const defaultCat = defaultMedicalExpenses.length > 0 ? '의료비용' : (uniqueCategoriesArray.length > 0 ? uniqueCategoriesArray[0] : '의료비용');
                const defaultAcc = defaultMedicalExpenses.length > 0 ? defaultMedicalExpenses[0].account_name : (accounts.length > 0 ? accounts[0].account_name : '');

                // Load Payment Data for the selected period
                const payments = await api.getPayment(currentPeriod.period_year, currentPeriod.period_name);
                if (payments && payments.length > 0) {
                    setLaborData(payments.map(p => ({
                        id: p.id,
                        dept_name: p.dept_name,
                        job_type: p.job_type,
                        emp_name: p.emp_name || '',
                        account_category: p.account_category || defaultCat,
                        account_name: p.account_name || defaultAcc,
                        headcount: p.headcount || 0,
                        total_amount: p.total_amount !== undefined ? p.total_amount : ((p.headcount || 0) * (p.avg_salary || 0)),
                        note: p.note || ''
                    })));
                } else {
                    // Default Fallback
                    const defaultDepts = filteredDepts.length > 0 ? filteredDepts : ['정형1', '정형2'];
                    const defaultJobs = jobNames.length > 0 ? jobNames : ['의사직', '간호직'];
                    setLaborData([
                        { id: 1, dept_name: defaultDepts[0] || '', job_type: defaultJobs[0] || '', emp_name: '정형1', account_category: defaultCat, account_name: defaultAcc, headcount: 1, total_amount: 11000000, note: '' }
                    ]);
                }
            } catch (err) {
                console.error("Failed to load labor data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [currentPeriod, isPeriodLoading]);

    const handleSave = async () => {
        try {
            const dataToSave = laborData.map(row => ({
                period_year: currentPeriod?.period_year,
                period_type: currentPeriod?.period_type,
                period_name: currentPeriod?.period_name,
                dept_name: row.dept_name,
                job_type: row.job_type,
                emp_name: row.emp_name,
                account_category: row.account_category,
                account_name: row.account_name,
                headcount: row.headcount,
                avg_salary: row.headcount > 0 ? Math.round(row.total_amount / row.headcount) : 0,
                total_amount: row.total_amount,
                note: row.note
            }));
            await api.savePayment(currentPeriod?.period_year, currentPeriod?.period_name, dataToSave);
            alert(`[${currentPeriod?.period_year}년 ${currentPeriod?.period_name}] 인건비 데이터가 저장되었습니다.`);
        } catch (err) {
            console.error(err);
            alert('저장에 실패했습니다.');
        }
    };

    const addRow = () => {
        const newId = Date.now();
        setLaborData([...laborData, {
            id: newId, 
            dept_name: availableDepts[0] || '', 
            job_type: jobCategories[0] || '', 
            emp_name: '',
            account_category: (() => {
                const exps = standardAccounts.filter(a => a.account_type === '의료비용');
                return exps.length > 0 ? '의료비용' : (uniqueAccountCategories.length > 0 ? uniqueAccountCategories[0] : '의료비용');
            })(),
            account_name: (() => {
                const exps = standardAccounts.filter(a => a.account_type === '의료비용');
                return exps.length > 0 ? exps[0].account_name : (standardAccounts.length > 0 ? standardAccounts[0].account_name : '');
            })(),
            headcount: 1, 
            total_amount: 0, 
            note: ''
        }]);
    };

    const updateRow = (id, field, value) => {
        setLaborData(laborData.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const totalHeadcount = laborData.reduce((sum, row) => sum + (row.headcount || 0), 0);
    const totalAmount = laborData.reduce((sum, row) => sum + (row.total_amount || 0), 0);

    const downloadTemplate = () => {
        const templateData = [{
            '부서': availableDepts[0] || '정형외과',
            '직종': jobCategories[0] || '의사직',
            '이름': '홍길동',
            '계정분류': (() => {
                const exps = standardAccounts.filter(a => a.account_type === '의료비용');
                return exps.length > 0 ? '의료비용' : (uniqueAccountCategories.length > 0 ? uniqueAccountCategories[0] : '의료비용');
            })(),
            '계정명': (() => {
                const exps = standardAccounts.filter(a => a.account_type === '의료비용');
                return exps.length > 0 ? exps[0].account_name : (standardAccounts.length > 0 ? standardAccounts[0].account_name : '');
            })(),
            '인원반영': 1,
            '총금액': 5000000,
            '비고': '예시 데이터입니다'
        }];
        exportToExcel(templateData, '인건비_업로드양식');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const importedData = await importFromExcel(file);
            if (importedData && importedData.length > 0) {
                // map keys to ensure they match laborData structure
                const mappedData = importedData.map((row, index) => ({
                    id: Date.now() + index,
                    dept_name: row.부서 || row.dept_name || row.dept || '',
                    job_type: row.직종 || row.job_type || row.jobType || '',
                    emp_name: row.이름 || row.사원명 || row.emp_name || row.name || '',
                    account_category: row.계정분류 || row.account_category || row.category || (() => {
                        const exps = standardAccounts.filter(a => a.account_type === '의료비용');
                        return exps.length > 0 ? '의료비용' : (uniqueAccountCategories.length > 0 ? uniqueAccountCategories[0] : '의료비용');
                    })(),
                    account_name: row.계정명 || row.account_name || row.account || (() => {
                        const exps = standardAccounts.filter(a => a.account_type === '의료비용');
                        return exps.length > 0 ? exps[0].account_name : (standardAccounts.length > 0 ? standardAccounts[0].account_name : '');
                    })(),
                    headcount: Number(row.인원반영 || row.인원수 || row.headcount || row.count || 0),
                    total_amount: Number(row.총금액 || row.total_amount || row.amount || row.amt || ((row.headcount || row.count || 0) * (row.avg_salary || row.avgSalary || 0)) || 0),
                    note: row.비고 || row.note || ''
                }));
                // 기존 데이터 삭제 후 업로드 데이터로 덮어쓰기
                setLaborData(mappedData);
                alert(`선택된 기간(${currentPeriod?.period_year}년 ${currentPeriod?.period_name})에 ${mappedData.length}건의 데이터를 성공적으로 불러왔습니다.\n[저장] 버튼을 눌러야 반영됩니다.`);
            } else {
                alert("불러올 데이터가 없습니다. 양식을 확인해주세요.");
            }
        } catch (err) {
            console.error(err);
            alert("파일을 읽는 중 오류가 발생했습니다.");
        } finally {
            // reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (isPeriodLoading || isLoading) {
        return <div style={{ padding: '20px' }}>Loading...</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h2 className={styles.title}>인건비</h2>
                </div>
            </header>

            <div className="ui-subtitle-box">
                부서별, 직종별 인원 구성과 인건비를 관리합니다.<br />
                - 부서 직종별 이름, 인원수, 인건비를 입력합니다.<br />
                - 기초코드(부서, 표준코드)에 정의된 항목만 선택 가능합니다.
            </div>

            <div className={styles.card}>
                <div className={styles.actions} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
                    <button className="ui-btn-secondary" onClick={addRow}><Plus size={16} /> 추가</button>
                    <button className="ui-btn-primary" onClick={handleSave}><Save size={16} /> 저장</button>
                    <button className="ui-btn-secondary" onClick={() => setIsDownloadModalOpen(true)}><FileDown size={16} /> 다운로드</button>
                    <button className="ui-btn-secondary" onClick={() => fileInputRef.current?.click()}><Upload size={16} /> 업로드</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" style={{ display: 'none' }} />
                </div>
                <div className={styles.tableWrapper}>
                    <table className="ui-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>NO</th>
                                <th className={styles.highlight}>부서</th>
                                <th className={styles.highlight}>직종</th>
                                <th className={styles.highlight}>이름</th>
                                <th className={styles.highlight}>계정분류</th>
                                <th className={styles.highlight}>계정명</th>
                                <th className={styles.highlight} title="급여 외 계정은 0으로 입력하여 중복 방지">인원반영</th>
                                <th className={styles.highlight}>총금액</th>
                                <th>비고</th>
                                <th style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {laborData.map((row, index) => (
                                <tr key={row.id}>
                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                    <td>
                                        <select className={styles.select} value={row.dept_name} onChange={(e) => updateRow(row.id, 'dept_name', e.target.value)}>
                                            {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <select className={styles.select} value={row.job_type} onChange={(e) => updateRow(row.id, 'job_type', e.target.value)}>
                                            {jobCategories.map(j => <option key={j} value={j}>{j}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <input type="text" className={styles.input} value={row.emp_name} onChange={(e) => updateRow(row.id, 'emp_name', e.target.value)} placeholder="이름 입력" style={{ textAlign: 'center' }} />
                                    </td>
                                    <td>
                                        <select className={styles.select} value={row.account_category} onChange={(e) => {
                                            const newCat = e.target.value;
                                            const newAccs = standardAccounts.filter(a => a.account_type === newCat);
                                            const newAccName = newAccs.length > 0 ? newAccs[0].account_name : '';
                                            const newData = laborData.map(r => r.id === row.id ? { ...r, account_category: newCat, account_name: newAccName } : r);
                                            setLaborData(newData);
                                        }}>
                                            {uniqueAccountCategories.length > 0 ? uniqueAccountCategories.map(cat => <option key={cat} value={cat}>{cat}</option>) : <option value={row.account_category}>{row.account_category}</option>}
                                        </select>
                                    </td>
                                    <td>
                                        <select className={styles.select} value={row.account_name} onChange={(e) => updateRow(row.id, 'account_name', e.target.value)}>
                                            {standardAccounts.filter(a => a.account_type === row.account_category).map(a => (
                                                <option key={a.id} value={a.account_name}>{a.account_name}</option>
                                            ))}
                                            {standardAccounts.filter(a => a.account_type === row.account_category).length === 0 && <option value={row.account_name}>{row.account_name}</option>}
                                        </select>
                                    </td>
                                    <td>
                                        <input type="number" className={styles.input} value={row.headcount} onChange={(e) => updateRow(row.id, 'headcount', parseInt(e.target.value) || 0)} style={{ textAlign: 'center' }} title="기본급여 외 계정은 0으로 입력" />
                                    </td>
                                    <td>
                                        <input type="text" className={styles.input} value={row.total_amount.toLocaleString()} onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            updateRow(row.id, 'total_amount', parseInt(val) || 0);
                                        }} style={{ textAlign: 'right' }} />
                                    </td>
                                    <td><input className={styles.input} value={row.note} onChange={(e) => updateRow(row.id, 'note', e.target.value)} placeholder="비고 입력" /></td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button onClick={() => setLaborData(laborData.filter(r => r.id !== row.id))} className="ui-btn-danger" title="삭제">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ backgroundColor: '#F8FAFC', fontWeight: 600 }}>
                                <td colSpan={6} style={{ textAlign: 'center' }}>총합계</td>
                                <td style={{ textAlign: 'center' }}>{totalHeadcount.toLocaleString()}</td>
                                <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                                    {totalAmount.toLocaleString()}
                                </td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* 다운로드 선택 모달 */}
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
                                onClick={() => {
                                    downloadTemplate();
                                    setIsDownloadModalOpen(false);
                                }}
                                style={{ padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 600 }}
                            >
                                <FileSpreadsheet size={18} color="#3b82f6" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>업로드 양식 다운로드</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>빈 엑셀 양식 포맷</div>
                                </div>
                            </button>
                            <button
                                onClick={() => {
                                    const exportData = laborData.map((row, index) => ({
                                        'NO': index + 1,
                                        '부서': row.dept_name,
                                        '직종': row.job_type,
                                        '이름': row.emp_name,
                                        '계정분류': row.account_category,
                                        '계정명': row.account_name,
                                        '인원반영': row.headcount,
                                        '총금액': row.total_amount,
                                        '비고': row.note
                                    }));
                                    exportToExcel(exportData, `인건비데이터_${currentPeriod?.period_year}_${currentPeriod?.period_name}`);
                                    setIsDownloadModalOpen(false);
                                }}
                                style={{ padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 600 }}
                            >
                                <FileDown size={18} color="#10b981" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>인건비 데이터 다운로드</div>
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

export default LaborInputPage;
