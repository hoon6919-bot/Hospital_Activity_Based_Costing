/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useContext } from 'react';
import { api } from '../api';
import { PeriodContext } from '../contexts/PeriodContext';
import { Settings, Cpu, FileBarChart, Layers, GitMerge, Save, Info, CheckCircle2, AlertCircle, FileDown, Upload, FileSpreadsheet, RefreshCw } from 'lucide-react';
import styles from './LogicPage.module.css';
import { exportToExcel, importFromExcel } from '../utils/excelExport';





const LogicPage = () => {
    const { currentPeriod } = useContext(PeriodContext);
    const [activeTab, setActiveTab] = useState('account');
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const fileInputRef = useRef(null);

    const [standardActivities, setStandardActivities] = useState(['외래활동', '회진활동', '수술활동', '검사활동', '행정활동']);
    const [accountLogicData, setAccountLogicData] = useState([]);
    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [driverTypeMap, setDriverTypeMap] = useState({});
    
    const [activityLogicMappings, setActivityLogicMappings] = useState({});
    const [costObjects, setCostObjects] = useState([]);
    const [departmentObjects, setDepartmentObjects] = useState([]);
    const [baseLaborData, setBaseLaborData] = useState([]);
    const [activityRatioData, setActivityRatioData] = useState([]);

    useEffect(() => {
        const loadAllData = async () => {
            if (!currentPeriod) return;
            const { period_year, period_name } = currentPeriod;

            try {
                // Context Data and Standard Activities
                try {
                    const stdActs = await api.getStandardActivities(period_year, period_name);
                    if (stdActs && stdActs.length > 0) {
                        setStandardActivities(stdActs.map(a => a.activity_name).filter(Boolean));
                    }
                } catch(e) {
                    console.error("Failed to load standard activities", e);
                }

                const savedDepts = await api.getDepartments(period_year, period_name);
                const savedCostObjs = await api.getCostObject(period_year, period_name);
                let dObjs = (savedDepts && Array.isArray(savedDepts) && savedDepts.length > 0) 
                    ? savedDepts.map(d => d.name) : ['병원', '정형외과', '정형1', '정형2', '외래검사실'];
                let cObjs = (savedCostObjs && Array.isArray(savedCostObjs) && savedCostObjs.length > 0)
                    ? savedCostObjs.map(d => d.name) : ['병원', '정형외과', '정형1', '정형2', '외래검사실', '의료사업'];
                
                setCostObjects(cObjs);
                setDepartmentObjects(dObjs);

                // Setup Driver Data from rules (생성기준 테이블)
                const typeMap = {};
                
                let driversList = [];
                try {
                    const dbDrivers = await api.getRules(period_year, period_name); // clinic_driver_logic
                    if (dbDrivers && dbDrivers.length > 0) {
                        driversList = [...new Set(dbDrivers.map(d => d.driver).filter(d => !!d))];
                        dbDrivers.forEach(d => {
                            if (d.valueType) typeMap[d.driver] = d.valueType === '부서' ? '부서' : '원가대상';
                        });
                    }
                } catch(e) {
                    console.error("Failed to load driver logic", e);
                }
                setAvailableDrivers(driversList);
                setDriverTypeMap(typeMap);

                // 2. Account Logic
                const accountRules = await api.getAllocationRulesAccount(period_year, period_name);
                let aRules = [];
                if (accountRules && accountRules.length > 0) {
                    aRules = accountRules.map(r => ({
                        id: r.id || Math.random(),
                        source: r.source,
                        dept: r.dept,
                        account_category: r.account_category,
                        account_name: r.account_name,
                        amount: r.amount,
                        allocation_method: r.allocation_method || '01.계정원가 배부',
                        driver: r.driver || '',
                        allocation_base: r.allocation_base || '전체',
                        allocation_scope: r.allocation_scope || '전체',
                        note: r.note || ''
                    }));
                }
                setAccountLogicData(aRules);

                // 3. Activity Ratio
                const ratios = await api.getActivityRatio(period_year, period_name);
                let payments = [];
                try { payments = await api.getPayment(period_year, period_name); } catch(e){ console.warn("No payment data found", e); }
                
                const laborGroupsMap = {};
                if (payments && payments.length > 0) {
                    payments.forEach(p => {
                        const deptName = p.dept_name || p.dept || '';
                        const jobType = p.job_type || '';
                        const empName = p.emp_name || '';
                        const key = `${deptName}-${jobType}-${empName}`;
                        if (!laborGroupsMap[key]) {
                            laborGroupsMap[key] = { dept: deptName, job_type: jobType, emp_name: empName, totalCount: 0 };
                        }
                        laborGroupsMap[key].totalCount += parseFloat(p.headcount || 1);
                    });
                }
                
                // Sort by dept so we can easily group them in UI
                const laborGroups = Object.values(laborGroupsMap).sort((a, b) => a.dept.localeCompare(b.dept));
                setBaseLaborData(laborGroups);

                const matrix = {};
                (ratios || []).forEach(r => {
                    const deptName = r.dept || '';
                    const jobType = r.job_type || '';
                    const empName = r.emp_name || '';
                    const key = `${deptName}-${jobType}-${empName}`;
                    if (!matrix[key]) matrix[key] = {};
                    matrix[key][r.activity_name] = r.ratio;
                });
                setActivityRatioData(matrix);

                // 4. Activity Logic
                const activityRules = await api.getAllocationRulesActivity(period_year, period_name);
                const actMap = {};
                (activityRules || []).forEach(r => {
                    const key = `${r.dept}|${r.activity_name}`;
                    actMap[key] = {
                        driver: r.driver || '',
                        allocation_method: r.allocation_method || '04.원가대상 배부',
                        allocation_base: r.allocation_base || '전체',
                        allocation_scope: r.allocation_scope || '전체'
                    };
                });
                setActivityLogicMappings(actMap);

            } catch (err) {
                console.error("Failed to load DB data", err);
            }
        };
        loadAllData();
    }, [currentPeriod]);

    // Show all standard activities for each department that has labor data
    const dynamicActivityRows = React.useMemo(() => {
        const sums = {};
        
        baseLaborData.forEach(group => {
            const empKey = `${group.dept}-${group.job_type}-${group.emp_name}`;
            const acts = activityRatioData[empKey] || {};
            
            Object.entries(acts).forEach(([act, ratio]) => {
                const r = parseFloat(ratio) || 0;
                if (r > 0) {
                    const key = `${group.dept}|${act}`;
                    if (!sums[key]) sums[key] = { dept: group.dept, activity: act, key: key, totalRatio: 0 };
                    sums[key].totalRatio += r;
                }
            });
        });
        
        return Object.values(sums).sort((a, b) => a.dept.localeCompare(b.dept) || a.activity.localeCompare(b.activity));
    }, [baseLaborData, activityRatioData]);

    const handleSyncAccountLogic = async () => {
        if (!currentPeriod) return;
        const { period_year, period_name } = currentPeriod;
        try {
            const expenses = await api.getExpenseData(period_year, period_name);
            const costingExpenses = (expenses || []).filter(e => e.costing_yn === 'Y');
            const payments = await api.getPayment(period_year, period_name);

            const newAccountData = [];
            let idCounter = Date.now();

            const expGroups = {};
            costingExpenses.forEach(e => {
                const key = `${e.dept}|${e.account_category}|${e.account_name}`;
                if (!expGroups[key]) expGroups[key] = { dept: e.dept, category: e.account_category, account: e.account_name, amount: 0 };
                expGroups[key].amount += parseFloat(e.amount || 0);
            });

            Object.values(expGroups).forEach(g => {
                newAccountData.push({
                    id: idCounter++, source: '전표', dept: g.dept, account_category: g.category, account_name: g.account,
                    amount: g.amount, allocation_method: '01.계정원가 배부', driver: '', allocation_base: '전체', allocation_scope: '전체'
                });
            });

            // 1. 인건비 데이터 부서별, 계정별 집계
            const payGroups = {};
            (payments || []).forEach(p => {
                const deptName = p.dept_name || p.dept || '';
                const cat = p.account_category || '';
                const actName = p.account_name || '';
                const key = `${deptName}|${cat}|${actName}`;
                if (!payGroups[key]) payGroups[key] = { dept: deptName, account_category: cat, account_name: actName, amount: 0 };
                payGroups[key].amount += parseFloat(p.total_amount || 0);
            });

            Object.values(payGroups).forEach(g => {
                newAccountData.push({
                    id: idCounter++, source: '인건비', dept: g.dept, account_category: g.account_category, account_name: g.account_name,
                    amount: g.amount, allocation_method: '01.계정원가 배부', driver: '', allocation_base: '전체', allocation_scope: '전체'
                });
            });

            const existingMap = {};
            accountLogicData.forEach(r => {
                // To preserve, key must match exactly.
                const key = `${r.source}|${r.dept}|${r.account_category}|${r.account_name}`;
                existingMap[key] = {
                    allocation_method: r.allocation_method, driver: r.driver, allocation_base: r.allocation_base, allocation_scope: r.allocation_scope
                };
            });

            newAccountData.forEach(r => {
                const key = `${r.source}|${r.dept}|${r.account_category}|${r.account_name}`;
                if (existingMap[key]) {
                    r.allocation_method = existingMap[key].allocation_method || r.allocation_method;
                    r.driver = existingMap[key].driver || r.driver;
                    r.allocation_base = existingMap[key].allocation_base || r.allocation_base;
                    r.allocation_scope = existingMap[key].allocation_scope || r.allocation_scope;
                }
            });

            setAccountLogicData(newAccountData);
            alert('데이터가 성공적으로 동기화되었습니다. [저장] 버튼을 눌러야 반영됩니다.');
        } catch (err) {
            console.error(err);
            alert('동기화 중 오류가 발생했습니다.');
        }
    };

    const handleSaveAccountLogic = async () => {
        if (!currentPeriod) return;
        try {
            const dataToSave = accountLogicData.map(r => ({ ...r, period_year: currentPeriod.period_year, period_type: currentPeriod.period_type, period_name: currentPeriod.period_name }));
            await api.saveAllocationRulesAccount(currentPeriod.period_year, currentPeriod.period_name, dataToSave);
            alert('계정원가 계산 로직이 DB에 성공적으로 저장되었습니다.');
        } catch(e) {
            alert('저장 실패: ' + e.message);
        }
    };

    const handleSaveRatio = async () => {
        if (!currentPeriod) return;
        let allValid = true;
        let invalidGroups = [];
        const exportList = [];

        baseLaborData.forEach(group => {
            const key = `${group.dept}-${group.job_type}-${group.emp_name}`;
            const activities = activityRatioData[key] || {};
            const sum = Object.values(activities).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
            
            if (Math.abs(sum - group.totalCount) > 0.001) {
                allValid = false;
                invalidGroups.push(`- ${group.dept} ${group.emp_name} (${group.job_type}) : 차이 ${(group.totalCount - sum).toFixed(2)}`);
            }

            Object.entries(activities).forEach(([act, val]) => {
                if (val > 0) {
                    exportList.push({
                        dept: group.dept, job_type: group.job_type, emp_name: group.emp_name,
                        activity_name: act, ratio: val, period_year: currentPeriod.period_year, period_type: currentPeriod.period_type, period_name: currentPeriod.period_name
                    });
                }
            });
        });

        if (!allValid) {
            const confirmMsg = `다음 대상의 활동비율 합계가 총 인원수와 일치하지 않습니다.\n${invalidGroups.join('\n')}\n\n이대로 강제 저장하시겠습니까?`;
            if (!window.confirm(confirmMsg)) return;
        }

        try {
            await api.saveActivityRatio(currentPeriod.period_year, currentPeriod.period_name, exportList);
            alert('활동비율 데이터가 DB에 성공적으로 저장되었습니다.');
        } catch(e) {
            alert('저장 실패: ' + e.message);
        }
    };

    const handleSaveActivityLogic = async () => {
        if (!currentPeriod) return;
        const exportList = dynamicActivityRows.map(row => {
            const mapping = activityLogicMappings[row.key] || {};
            return {
                dept: row.dept,
                activity_name: row.activity,
                allocation_method: mapping.allocation_method || '04.원가대상 배부',
                driver: mapping.driver || '',
                allocation_base: mapping.allocation_base || '전체',
                allocation_scope: mapping.allocation_scope || '전체',
                period_year: currentPeriod.period_year, period_type: currentPeriod.period_type, period_name: currentPeriod.period_name
            };
        });

        try {
            await api.saveAllocationRulesActivity(currentPeriod.period_year, currentPeriod.period_name, exportList);
            alert('활동원가 계산로직이 DB에 성공적으로 저장되었습니다.');
        } catch(e) {
            alert('저장 실패: ' + e.message);
        }
    };

    // Table Updaters
    const updateAccountRow = (id, field, value) => {
        setAccountLogicData(prev => prev.map(row => {
            if (row.id === id) {
                const updated = { ...row, [field]: value };
                if (field === 'driver') {
                    const type = driverTypeMap[value];
                    if (type === '원가대상') {
                        if (!['전체', '진료과', '시행과', '처방의사', '시행의사'].includes(updated.allocation_base)) updated.allocation_base = '전체';
                        if (updated.allocation_scope !== '전체' && !costObjects.includes(updated.allocation_scope)) updated.allocation_scope = '전체';
                    } else if (type === '부서') {
                        if (!['전체', '부서'].includes(updated.allocation_base)) updated.allocation_base = '전체';
                        if (updated.allocation_scope !== '전체' && !departmentObjects.includes(updated.allocation_scope)) updated.allocation_scope = '전체';
                    }
                }
                return updated;
            }
            return row;
        }));
    };

    const updateMatrixValue = (dept, job_type, emp_name, activity, value) => {
        setActivityRatioData(prev => {
            const key = `${dept}-${job_type}-${emp_name}`;
            const newMatrix = { ...prev };
            if (!newMatrix[key]) newMatrix[key] = {};
            newMatrix[key] = { ...newMatrix[key], [activity]: parseFloat(value) || 0 };
            return newMatrix;
        });
    };

    const updateActivityMapping = (key, field, value) => {
        setActivityLogicMappings(prev => {
            const current = prev[key] || { allocation_method: '04.원가대상 배부', driver: '', allocation_base: '전체', allocation_scope: '전체' };
            const updated = { ...current, [field]: value };
            if (field === 'driver') {
                const type = driverTypeMap[value];
                if (type === '원가대상') updated.allocation_base = '전체';
                else if (type === '부서') updated.allocation_base = '부서';
            }
            return { ...prev, [key]: updated };
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await importFromExcel(file);
            if (data && data.length > 0) {
                if (activeTab === 'account') {
                    const mappedData = data.map((row, idx) => ({
                        id: Date.now() + idx,
                        source: row.구분 || row.source || '전표',
                        dept: row.부서 || row.dept || '',
                        account_category: row.계정분류 || row.account_category || '',
                        account_name: row.계정명 || row.account_name || '',
                        amount: Number(row.금액 || row.amount || 0),
                        allocation_method: row.배부방법 || row.allocation_method || '01.계정원가 배부',
                        driver: row.배부드라이버 || row.driver || '',
                        allocation_base: row.배부관점 || row.allocation_base || '전체',
                        allocation_scope: row.배부범위 || row.allocation_scope || '전체'
                    }));
                    setAccountLogicData(mappedData);
                } else if (activeTab === 'ratio') {
                    const newMatrix = { ...activityRatioData };
                    data.forEach(row => {
                        const dept = row.부서 || row.dept || row.dept_name || '';
                        const job = row.직종 || row.job_type || '';
                        const emp = row.이름 || row.emp_name || '';
                        const act = row.표준활동명 || row.activity_name || '';
                        const ratio = Number(row.활동비율 || row.ratio || 0);
                        
                        if (dept && act) {
                            const key = `${dept}-${job}-${emp}`;
                            if (!newMatrix[key]) newMatrix[key] = {};
                            newMatrix[key][act] = ratio;
                        }
                    });
                    setActivityRatioData(newMatrix);
                } else if (activeTab === 'activity') {
                    const newMappings = { ...activityLogicMappings };
                    data.forEach(row => {
                        const key = `${row.배부부서 || row.dept}|${row.원가활동 || row.activity_name}`;
                        newMappings[key] = {
                            allocation_method: row.배부방법 || row.allocation_method || '04.원가대상 배부',
                            driver: row.배부드라이버 || row.driver || '',
                            allocation_base: row.배부관점 || row.allocation_base || row.view || '전체',
                            allocation_scope: row.배부범위 || row.allocation_scope || row.scope || '전체'
                        };
                    });
                    setActivityLogicMappings(newMappings);
                }
                alert(`성공적으로 불러왔습니다.\n[저장] 버튼을 눌러야 반영됩니다.`);
            }
        } catch (err) {
            console.error(err);
            alert("파일을 읽는 중 오류가 발생했습니다.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const downloadTemplate = () => {
        if (activeTab === 'account') {
            exportToExcel([{ 구분: '전표', 부서: '행정팀', 계정분류: '의료비용', 계정명: '관리비', 금액: 0, 배부방법: '01.계정원가 배부', 배부드라이버: '부서별인원수', 배부관점: '전체', 배부범위: '전체' }], '계정배부로직설정_업로드양식');
        } else if (activeTab === 'ratio') {
            const template = [];
            standardActivities.forEach(act => {
                template.push({
                    회계기간: currentPeriod ? currentPeriod.period_year : '',
                    기간유형: currentPeriod ? currentPeriod.period_type : '',
                    기간명: currentPeriod ? currentPeriod.period_name : '',
                    부서: '정형1', 직종: '의사직', 이름: '정형1',
                    표준활동명: act,
                    활동비율: 0
                });
            });
            exportToExcel(template, '활동비율설정_업로드양식');
        } else if (activeTab === 'activity') {
            exportToExcel([{ 
                회계기간: currentPeriod ? currentPeriod.period_year : '',
                기간유형: currentPeriod ? currentPeriod.period_type : '',
                기간명: currentPeriod ? currentPeriod.period_name : '',
                배부부서: '정형1', 
                원가활동: '외래활동', 
                배부방법: '04.원가대상 배부', 
                배부드라이버: '외래환자수', 
                배부관점: '전체', 
                배부범위: '전체' 
            }], '활동배부로직설정_업로드양식');
        }
    };

    const renderViewOptions = (driver) => {
        const type = driverTypeMap[driver];
        if (type === '원가대상') {
            return (
                <>
                    <option value="전체">전체</option>
                    <option value="진료과">진료과</option>
                    <option value="시행과">시행과</option>
                    <option value="처방의사">처방의사</option>
                    <option value="시행의사">시행의사</option>
                </>
            );
        } else if (type === '부서') {
            return (
                <>
                    <option value="전체">전체</option>
                    <option value="부서">부서</option>
                </>
            );
        }
        return <option value="전체">전체</option>;
    };

    const renderScopeOptions = (driver) => {
        const type = driverTypeMap[driver];
        if (type === '원가대상') {
            return (
                <>
                    <option value="전체">전체</option>
                    {costObjects.map(name => <option key={name} value={name}>{name}</option>)}
                </>
            );
        } else if (type === '부서') {
            return (
                <>
                    <option value="전체">전체</option>
                    {departmentObjects.map(name => <option key={name} value={name}>{name}</option>)}
                </>
            );
        }
        return <option value="전체">전체</option>;
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection} style={{ flex: 1 }}>
                    <h2 className={styles.title}>원가 계산 로직 설정</h2>
                </div>
                <div className="ui-tab-container">
                    <button className={`ui-tab-button ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')}>
                        <Layers size={16} /> 계정 로직
                    </button>
                    <button className={`ui-tab-button ${activeTab === 'ratio' ? 'active' : ''}`} onClick={() => setActiveTab('ratio')}>
                        <GitMerge size={16} /> 활동 비율
                    </button>
                    <button className={`ui-tab-button ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
                        <Settings size={16} /> 활동 로직
                    </button>
                </div>
            </header>

            <div className="ui-subtitle-box">
                계정 및 활동 단위의 원가 배부 방식을 정의하고 관리합니다.<br />
                {activeTab === 'account' && "- 계정별 발생 원가를 활동 혹은 원가대상으로 배부하기 위한 드라이버를 설정합니다."}
                {activeTab === 'ratio' && "- 부서/직종별 인원수를 각 표준 활동에 사전에 정의된 비율로 분배하여 입력합니다."}
                {activeTab === 'activity' && "- 집계된 활동원가를 최종 원가대상(진료과 등)으로 배부하기 위한 로직을 설정합니다."}
            </div>

            <div className={styles.card}>
                <div className={styles.actions} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-start', gap: '8px', background: '#f8fafc' }}>
                    {activeTab === 'account' && (
                        <button onClick={handleSyncAccountLogic} className="ui-btn-secondary" style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <RefreshCw size={16} /> 동기화
                        </button>
                    )}
                    <div style={{ flex: 1 }}></div>
                    {activeTab === 'account' && (
                        <button onClick={handleSaveAccountLogic} className="ui-btn-primary">
                            <Save size={16} /> 저장
                        </button>
                    )}
                    {activeTab === 'ratio' && (
                        <button onClick={handleSaveRatio} className="ui-btn-primary">
                            <Save size={16} /> 저장
                        </button>
                    )}
                    {activeTab === 'activity' && (
                        <button onClick={handleSaveActivityLogic} className="ui-btn-primary">
                            <Save size={16} /> 저장
                        </button>
                    )}
                    <button className="ui-btn-secondary" onClick={() => setIsDownloadModalOpen(true)}>
                        <FileDown size={16} /> 다운로드
                    </button>
                    <button className="ui-btn-secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={16} /> 업로드
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" style={{ display: 'none' }} />
                </div>
                
                <div className={styles.tableWrapper}>
                    {activeTab === 'account' && (
                        <table className="ui-table">
                            <thead>
                                <tr>
                                    <th>구분</th>
                                    <th>부서</th>
                                    <th>계정분류</th>
                                    <th>계정명</th>
                                    <th className={styles.rightAligned}>금액</th>
                                    <th className={styles.highlightHeader}>배부 방법</th>
                                    <th className={styles.highlightHeader}>배부 드라이버</th>
                                    <th className={styles.highlightHeader}>배부 관점</th>
                                    <th className={styles.highlightHeader}>배부 범위</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accountLogicData.map((row) => (
                                    <tr key={row.id}>
                                        <td style={{ textAlign: 'center' }}>{row.source}</td>
                                        <td style={{ textAlign: 'center' }}>{row.dept}</td>
                                        <td>{row.account_category}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.account_name}</td>
                                        <td style={{ textAlign: 'right', paddingRight: '20px' }}>{(row.amount || 0).toLocaleString()}</td>
                                        <td>
                                            <select value={row.allocation_method || '01.계정원가 배부'} onChange={(e) => updateAccountRow(row.id, 'allocation_method', e.target.value)} className={styles.selectField}>
                                                <option value="01.계정원가 배부">01.계정원가 배부</option>
                                                <option value="02.활동원가 전환">02.활동원가 전환</option>
                                                <option value="04.원가대상 배부">04.원가대상 배부</option>
                                            </select>
                                        </td>
                                        <td>
                                            <select value={row.driver || ''} onChange={(e) => updateAccountRow(row.id, 'driver', e.target.value)} className={styles.selectField}>
                                                <option value="">-- 선택 --</option>
                                                {availableDrivers.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <select value={row.allocation_base || '전체'} onChange={(e) => updateAccountRow(row.id, 'allocation_base', e.target.value)} className={styles.selectField} disabled={!row.driver}>
                                                {renderViewOptions(row.driver)}
                                            </select>
                                        </td>
                                        <td>
                                            <select value={row.allocation_scope || '전체'} onChange={(e) => updateAccountRow(row.id, 'allocation_scope', e.target.value)} className={styles.selectField} disabled={!row.driver}>
                                                {renderScopeOptions(row.driver)}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', color: '#475569' }}>총 합계</td>
                                    <td style={{ textAlign: 'right', paddingRight: '20px', color: 'var(--color-primary)' }}>
                                        {accountLogicData.reduce((sum, row) => sum + (row.amount || 0), 0).toLocaleString()}
                                    </td>
                                    <td colSpan="4"></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}

                    {activeTab === 'ratio' && (
                        <div style={{ padding: '0', overflowX: 'auto' }}>
                            <table className="ui-table" style={{ tableLayout: 'auto', minWidth: '800px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', minWidth: '100px' }}>부서</th>
                                        <th style={{ textAlign: 'left', minWidth: '80px' }}>직종</th>
                                        <th style={{ textAlign: 'left', minWidth: '80px' }}>이름</th>
                                        <th style={{ minWidth: '60px', whiteSpace: 'nowrap' }}>총원</th>
                                        {standardActivities.map(act => (
                                            <th key={act} style={{ minWidth: '80px', whiteSpace: 'nowrap' }}>{act}</th>
                                        ))}
                                        <th style={{ minWidth: '80px', whiteSpace: 'nowrap' }}>입력 합</th>
                                        <th style={{ minWidth: '60px', whiteSpace: 'nowrap' }}>상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        let currentDept = '';
                                        const rows = [];
                                        baseLaborData.forEach((group) => {
                                            // 부서 소계 추가
                                            if (currentDept !== group.dept) {
                                                currentDept = group.dept;
                                            }

                                            const key = `${group.dept}-${group.job_type}-${group.emp_name}`;
                                            const values = activityRatioData[key] || {};
                                            const sum = standardActivities.reduce((acc, act) => acc + (values[act] || 0), 0);
                                            const isMatch = Math.abs(group.totalCount - sum) < 0.001;

                                            rows.push(
                                                <tr key={key}>
                                                    <td style={{ fontWeight: 500 }}>{group.dept}</td>
                                                    <td>{group.job_type}</td>
                                                    <td>{group.emp_name}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)' }}>{group.totalCount}</td>
                                                    {standardActivities.map(act => (
                                                        <td key={act}>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={values[act] !== undefined ? values[act] : ''}
                                                                onChange={(e) => updateMatrixValue(group.dept, group.job_type, group.emp_name, act, e.target.value)}
                                                                className={`${styles.matrixInput} ${values[act] > 0 ? styles.matrixInputActive : ''}`}
                                                                placeholder="0.0"
                                                                style={{ width: '100%', minWidth: '60px' }}
                                                            />
                                                        </td>
                                                    ))}
                                                    <td style={{ textAlign: 'center' }} className={isMatch ? styles.statusOk : styles.statusError}>
                                                        {parseFloat(sum.toFixed(2))}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {isMatch ? <CheckCircle2 size={16} className={styles.statusOk} /> : <AlertCircle size={16} className={styles.statusError} />}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                        return rows;
                                    })()}
                                </tbody>
                                <tfoot style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: 'center', color: '#475569' }}>총 합계</td>
                                        <td style={{ textAlign: 'center', color: 'var(--color-primary)' }}>
                                            {parseFloat(baseLaborData.reduce((sum, g) => sum + g.totalCount, 0).toFixed(2))}
                                        </td>
                                        {standardActivities.map(act => {
                                            const actSum = baseLaborData.reduce((sum, group) => {
                                                const key = `${group.dept}-${group.job_type}-${group.emp_name}`;
                                                const val = (activityRatioData[key] || {})[act] || 0;
                                                return sum + val;
                                            }, 0);
                                            return (
                                                <td key={act} style={{ textAlign: 'center', color: 'var(--color-primary)' }}>
                                                    {actSum > 0 ? parseFloat(actSum.toFixed(2)) : 0}
                                                </td>
                                            );
                                        })}
                                        <td style={{ textAlign: 'center', color: 'var(--color-primary)' }}>
                                            {parseFloat(baseLaborData.reduce((totalSum, group) => {
                                                const key = `${group.dept}-${group.job_type}-${group.emp_name}`;
                                                const values = activityRatioData[key] || {};
                                                const empSum = standardActivities.reduce((acc, a) => acc + (values[a] || 0), 0);
                                                return totalSum + empSum;
                                            }, 0).toFixed(2))}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ui-table" style={{ minWidth: '800px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ minWidth: '100px' }}>배부 부서</th>
                                        <th style={{ minWidth: '120px' }}>원가 활동</th>
                                        <th style={{ minWidth: '100px' }}>총 활동비율</th>
                                        <th className={styles.highlightHeader} style={{ minWidth: '180px' }}>배부 방법</th>
                                        <th className={styles.highlightHeader} style={{ minWidth: '150px' }}>배부 드라이버</th>
                                        <th className={styles.highlightHeader} style={{ minWidth: '120px' }}>배부 관점</th>
                                        <th className={styles.highlightHeader} style={{ minWidth: '120px' }}>배부 범위</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dynamicActivityRows.map((row) => {
                                        const mapping = activityLogicMappings[row.key] || { allocation_method: '04.원가대상 배부', driver: '', allocation_base: '전체', allocation_scope: '전체' };
                                        return (
                                            <tr key={row.key}>
                                                <td style={{ textAlign: 'center' }}>{row.dept}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.activity}</td>
                                                <td style={{ textAlign: 'center', color: 'var(--color-primary)', fontWeight: 600 }}>{parseFloat(row.totalRatio.toFixed(2))}</td>
                                                <td>
                                                    <select value={mapping.allocation_method || '04.원가대상 배부'} onChange={(e) => updateActivityMapping(row.key, 'allocation_method', e.target.value)} className={styles.selectField} style={{ width: '100%' }}>
                                                        <option value="03.활동원가 타부서 배부">03.활동원가 타부서 배부</option>
                                                        <option value="04.원가대상 배부">04.원가대상 배부</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <select value={mapping.driver} onChange={(e) => updateActivityMapping(row.key, 'driver', e.target.value)} className={styles.selectField} style={{ width: '100%' }}>
                                                        <option value="">-- 선택 --</option>
                                                        {availableDrivers.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                </td>
                                                <td>
                                                    <select value={mapping.allocation_base} onChange={(e) => updateActivityMapping(row.key, 'allocation_base', e.target.value)} className={styles.selectField} disabled={!mapping.driver} style={{ width: '100%' }}>
                                                        {renderViewOptions(mapping.driver)}
                                                    </select>
                                                </td>
                                                <td>
                                                    <select value={mapping.allocation_scope} onChange={(e) => updateActivityMapping(row.key, 'allocation_scope', e.target.value)} className={styles.selectField} disabled={!mapping.driver} style={{ width: '100%' }}>
                                                        {renderScopeOptions(mapping.driver)}
                                                    </select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {dynamicActivityRows.length === 0 && (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                                활동비율이 배부된 데이터가 없습니다. 먼저 활동비율을 입력해주세요.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {dynamicActivityRows.length > 0 && (
                                    <tfoot style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                                        <tr>
                                            <td colSpan="2" style={{ textAlign: 'center', color: '#475569' }}>총 합계</td>
                                            <td style={{ textAlign: 'center', color: 'var(--color-primary)' }}>
                                                {parseFloat(dynamicActivityRows.reduce((sum, r) => sum + r.totalRatio, 0).toFixed(2))}
                                            </td>
                                            <td colSpan="4"></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {isDownloadModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '320px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>다운로드 선택</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button onClick={() => { downloadTemplate(); setIsDownloadModalOpen(false); }} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 600 }}>
                                <FileSpreadsheet size={18} color="#3b82f6" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>업로드 양식 다운로드</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>빈 엑셀 양식 포맷</div>
                                </div>
                            </button>
                            <button onClick={() => {
                                if (activeTab === 'account') {
                                    exportToExcel(accountLogicData.map(r => ({ 구분: r.source, 부서: r.dept, 계정분류: r.account_category, 계정명: r.account_name, 금액: r.amount, 배부방법: r.allocation_method, 배부드라이버: r.driver, 배부관점: r.allocation_base, 배부범위: r.allocation_scope })), '계정배부로직설정_데이터');
                                } else if (activeTab === 'ratio') {
                                    const exportList = [];
                                    baseLaborData.forEach(group => {
                                        const key = `${group.dept}-${group.job_type}-${group.emp_name}`;
                                        const values = activityRatioData[key] || {};
                                        standardActivities.forEach(act => {
                                            exportList.push({
                                                회계기간: currentPeriod ? currentPeriod.period_year : '',
                                                기간유형: currentPeriod ? currentPeriod.period_type : '',
                                                기간명: currentPeriod ? currentPeriod.period_name : '',
                                                부서: group.dept, 직종: group.job_type, 이름: group.emp_name,
                                                표준활동명: act, 활동비율: values[act] || 0
                                            });
                                        });
                                    });
                                    exportToExcel(exportList, '활동비율설정_데이터');
                                } else if (activeTab === 'activity') {
                                    const exportList = dynamicActivityRows.map(row => {
                                        const mapping = activityLogicMappings[row.key] || {};
                                        return { 
                                            회계기간: currentPeriod ? currentPeriod.period_year : '',
                                            기간유형: currentPeriod ? currentPeriod.period_type : '',
                                            기간명: currentPeriod ? currentPeriod.period_name : '',
                                            배부부서: row.dept, 
                                            원가활동: row.activity, 
                                            배부방법: mapping.allocation_method, 
                                            배부드라이버: mapping.driver, 
                                            배부관점: mapping.allocation_base, 
                                            배부범위: mapping.allocation_scope 
                                        };
                                    });
                                    exportToExcel(exportList, '활동배부로직설정_데이터');
                                }
                                setIsDownloadModalOpen(false);
                            }} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 600 }}>
                                <FileDown size={18} color="#10b981" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>데이터 다운로드</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>현재 탭의 데이터 전체</div>
                                </div>
                            </button>
                        </div>
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsDownloadModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 600 }}>닫기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogicPage;
