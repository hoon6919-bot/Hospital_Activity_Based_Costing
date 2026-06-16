import React, { useState, useMemo, useEffect, useCallback, useContext } from 'react';
import { Plus, Trash2, Save, FileDown, AlertTriangle, ChevronRight, ChevronDown, Building2, Target } from 'lucide-react';
import styles from './SetupPage.module.css';
import { exportToExcel } from '../utils/excelExport';
import { api } from '../api';
import { PeriodContext } from '../contexts/PeriodContext';

const DEFAULT_ACTIVITIES = [
    { no: 1, type: '활동', name: '외래활동' }, { no: 2, type: '활동', name: '회진활동' }, { no: 3, type: '활동', name: '수술활동' }, { no: 4, type: '활동', name: '검사활동' }, { no: 5, type: '활동', name: '행정활동' }
];
const DEFAULT_JOBS = [
    { no: 1, type: '직종', name: '의사직' }, { no: 2, type: '직종', name: '간호직' }, { no: 3, type: '직종', name: '보건직' }, { no: 4, type: '직종', name: '행정직' }, { no: 5, type: '직종', name: '기타직' }
];
const DEFAULT_ACCOUNTS = [
    { no: 1, group: '의료수익', name: '외래수익' }, { no: 2, group: '의료수익', name: '입원수익' },
    { no: 3, group: '의료비용', name: '인건비' }, { no: 4, group: '의료비용', name: '재료비' },
    { no: 5, group: '의료비용', name: '상각비' }, { no: 6, group: '의료비용', name: '관리비' },
    { no: 7, group: '의료외수익', name: '의료외수익' }, { no: 8, group: '의료외비용', name: '의료외비용' }
];
const DEFAULT_DRIVERS = [
    { no: 1, type: '원가대상', name: '수익비(전체)' }, { no: 2, type: '원가대상', name: '수익비(행위)' },
    { no: 3, type: '원가대상', name: '수익비(재료)' }, { no: 4, type: '원가대상', name: '외래환자수' },
    { no: 5, type: '원가대상', name: '입원환자수' }, { no: 6, type: '원가대상', name: '수술환자수' },
    { no: 7, type: '원가대상', name: '마취환자수' }, { no: 8, type: '원가대상', name: '검사환자수' },
    { no: 9, type: '원가대상', name: '수술시간' }, { no: 10, type: '원가대상', name: '마취시간' },
    { no: 11, type: '부서', name: '부서별면적비' }, { no: 12, type: '부서', name: '부서별인원수' },
    { no: 13, type: '부서', name: '부서별인건비' }, { no: 14, type: '부서', name: '부서별재료비' },
    { no: 15, type: '부서', name: '부서별상각비' }, { no: 16, type: '부서', name: '부서별관리비' },
    { no: 17, type: '부서', name: '부서별비용(전체)' }
];

// ── 기본 데이터 ──
const DEFAULT_DEPARTMENTS = [
    { id: 1, name: '병원', parentName: '', level: 1, isDept: true, isCostObj: true },
    { id: 2, name: '정형외과', parentName: '병원', level: 2, isDept: true, isCostObj: true },
    { id: 3, name: '진료지원', parentName: '병원', level: 2, isDept: true, isCostObj: false },
    { id: 4, name: '행정지원', parentName: '병원', level: 2, isDept: true, isCostObj: false },
    { id: 5, name: '정형1', parentName: '정형외과', level: 3, isDept: true, isCostObj: true },
    { id: 6, name: '정형2', parentName: '정형외과', level: 3, isDept: true, isCostObj: true },
    { id: 7, name: '정형3', parentName: '정형외과', level: 3, isDept: true, isCostObj: true },
    { id: 8, name: '정형4', parentName: '정형외과', level: 3, isDept: true, isCostObj: true },
    { id: 9, name: '외래검사실', parentName: '진료지원', level: 3, isDept: true, isCostObj: false },
    { id: 10, name: '원무팀', parentName: '행정지원', level: 3, isDept: true, isCostObj: false },
    { id: 11, name: '행정팀', parentName: '행정지원', level: 3, isDept: true, isCostObj: false },
];

const Card = ({ title, actions, children }) => (
    <div className={styles.card}>
        <div className={styles.summaryTitle} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{title}</span>
            {actions && <div style={{ display: 'flex', gap: '8px' }}>{actions}</div>}
        </div>
        <div style={{ padding: '20px' }}>
            {children}
        </div>
    </div>
);

// ── 트리 노드 컴포넌트 ──
const TreeNode = ({ node, depth = 0 }) => {
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div>
            <div
                className={styles.treeNode}
                style={{ paddingLeft: `${depth * 24 + 12}px` }}
                onClick={() => hasChildren && setIsOpen(!isOpen)}
            >
                <span className={styles.treeToggle}>
                    {hasChildren ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14, display: 'inline-block' }} />}
                </span>
                <span className={styles.treeName}>{node.name}</span>
                <span className={styles.treeBadges}>
                    {node.isDept && <span className={styles.badgeDept}><Building2 size={10} /> 부서</span>}
                    {node.isCostObj && <span className={styles.badgeCostObj}><Target size={10} /> 원가대상</span>}
                </span>
            </div>
            {isOpen && hasChildren && (
                <div>
                    {node.children.map(child => (
                        <TreeNode key={child.id || child.name} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

// ══════════════════════════════════════
//  메인 컴포넌트
// ══════════════════════════════════════
const SetupPage = () => {
    const [activeTab, setActiveTab] = useState('dept');
    const [isLoading, setIsLoading] = useState(true);

    const { currentPeriod } = useContext(PeriodContext);

    // ── 부서/원가대상 데이터 ──
    const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);

    // ── 표준 기초코드 데이터 ──
    const [isStandardEditMode, setIsStandardEditMode] = useState(false);
    const [stdActivities, setStdActivities] = useState([]);
    const [stdJobs, setStdJobs] = useState([]);
    const [stdAccounts, setStdAccounts] = useState([]);
    const [stdDrivers, setStdDrivers] = useState([]);

    // ── 초기 데이터 로드 ──
    useEffect(() => {
        const loadData = async () => {
            try {
                const newDepts = await api.getDepartments();
                if (newDepts && newDepts.length > 0) {
                    setDepartments(newDepts.map(d => ({
                        id: d.id, name: d.name, parentName: d.parent_name || '', level: d.level,
                        isDept: d.is_dept === 1, isCostObj: false // costObj will be merged later if needed, or we just rely on new logic
                    })));
                    
                    // Actually, let's load cost objects to merge isCostObj correctly
                    const newCostObjs = await api.getCostObject();
                    setDepartments(prev => {
                        const merged = [...prev];
                        newCostObjs.forEach(co => {
                            const existing = merged.find(d => d.name === co.name);
                            if (existing) existing.isCostObj = true;
                            else merged.push({
                                id: Math.max(...merged.map(m=>m.id), 0) + 1,
                                name: co.name, parentName: co.parent_name || '', level: co.level,
                                isDept: false, isCostObj: true
                            });
                        });
                        return merged;
                    });
                } else {
                    // Fallback to legacy
                    const stored = await api.getStore('clinic_departments');
                    if (stored && Array.isArray(stored) && stored.length > 0) {
                        const converted = stored.map(d => ({
                            id: d.id,
                            name: d.name || '',
                            parentName: d.parentName || d.levels?.[d.level - 1] || '',
                            level: d.level || 1,
                            isDept: d.isDept !== undefined ? d.isDept : true,
                            isCostObj: d.isCostObj !== undefined ? d.isCostObj : false,
                        }));
                        setDepartments(converted);
                    }
                }

                // 표준 기초코드 로드
                const [actDb, jobDb, accDb, drvDb] = await Promise.all([
                    api.getStandardActivities().catch(()=>[]),
                    api.getStandardJobs().catch(()=>[]),
                    api.getStandardAccounts().catch(()=>[]),
                    api.getStandardDrivers().catch(()=>[])
                ]);
                
                setStdActivities(actDb.length > 0 ? actDb.map(d => ({id: d.id, type: d.activity_type, name: d.activity_name})) 
                    : DEFAULT_ACTIVITIES.map((d,i) => ({id: i+1, ...d})));
                setStdJobs(jobDb.length > 0 ? jobDb.map(d => ({id: d.id, type: d.job_type, name: d.job_name}))
                    : DEFAULT_JOBS.map((d,i) => ({id: i+1, ...d})));
                setStdAccounts(accDb.length > 0 ? accDb.map(d => ({id: d.id, group: d.account_type, name: d.account_name}))
                    : DEFAULT_ACCOUNTS.map((d,i) => ({id: i+1, ...d})));
                setStdDrivers(drvDb.length > 0 ? drvDb.map(d => ({id: d.id, type: d.driver_type, name: d.driver_name}))
                    : DEFAULT_DRIVERS.map((d,i) => ({id: i+1, ...d})));
            } catch (e) {
                console.error('데이터 로드 실패:', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // ── 트리 구조 생성 ──
    const treeData = useMemo(() => {
        const buildTree = (items) => {
            const roots = [];
            const map = {};

            items.forEach(item => {
                map[item.name] = { ...item, children: [] };
            });

            items.forEach(item => {
                if (item.parentName && map[item.parentName]) {
                    map[item.parentName].children.push(map[item.name]);
                } else if (!item.parentName || item.parentName === '') {
                    roots.push(map[item.name]);
                } else {
                    // 상위부서를 찾을 수 없는 경우 루트에 추가
                    roots.push(map[item.name]);
                }
            });

            return roots;
        };

        return buildTree(departments);
    }, [departments]);

    // ── 무결성 검증 ──
    const validationErrors = useMemo(() => {
        const errors = [];
        const nameSet = new Set(departments.map(d => d.name));

        departments.forEach((dept, index) => {
            // 이름 비어있는 경우
            if (!dept.name.trim()) {
                errors.push({ row: index + 1, msg: `${index + 1}행: 부서명이 비어있습니다.` });
            }
            // 상위부서가 존재하지 않는 경우
            if (dept.parentName && !nameSet.has(dept.parentName)) {
                errors.push({ row: index + 1, msg: `${index + 1}행: 상위부서 '${dept.parentName}'가 존재하지 않습니다.` });
            }
            // 레벨 검증: 상위부서 레벨보다 커야 함
            if (dept.parentName) {
                const parent = departments.find(d => d.name === dept.parentName);
                if (parent && dept.level <= parent.level) {
                    errors.push({ row: index + 1, msg: `${index + 1}행: 레벨(${dept.level})이 상위부서 '${dept.parentName}'의 레벨(${parent.level})보다 커야 합니다.` });
                }
            }
            // 순환 참조 방지
            if (dept.parentName === dept.name) {
                errors.push({ row: index + 1, msg: `${index + 1}행: 자기 자신을 상위부서로 지정할 수 없습니다.` });
            }
        });

        // 중복 이름 체크
        const names = departments.map(d => d.name).filter(n => n.trim());
        const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
        if (duplicates.length > 0) {
            errors.push({ row: 0, msg: `중복된 부서명이 있습니다: ${[...new Set(duplicates)].join(', ')}` });
        }

        return errors;
    }, [departments]);

    // ── 상위부서 드롭다운 옵션 ──
    const parentOptions = useMemo(() => {
        return ['', ...departments.map(d => d.name).filter(n => n.trim())];
    }, [departments]);

    // ── 행 추가 ──
    const addDepartment = () => {
        const newId = departments.length > 0 ? Math.max(...departments.map(d => d.id)) + 1 : 1;
        setDepartments([...departments, {
            id: newId, name: '', parentName: '', level: 2, isDept: true, isCostObj: false
        }]);
    };

    // ── 행 수정 ──
    const updateDepartment = (id, field, value) => {
        setDepartments(prev => prev.map(d => {
            if (d.id !== id) return d;
            const updated = { ...d, [field]: value };

            // 상위부서 변경 시 레벨 자동 계산
            if (field === 'parentName' && value) {
                const parent = prev.find(p => p.name === value);
                if (parent) {
                    updated.level = parent.level + 1;
                }
            }
            return updated;
        }));
    };

    // ── 행 삭제 (참조 검증 포함) ──
    const removeDepartment = async (id) => {
        const dept = departments.find(d => d.id === id);
        if (!dept) return;

        // 자식 부서가 있는지 확인
        const children = departments.filter(d => d.parentName === dept.name);
        if (children.length > 0) {
            const childNames = children.map(c => c.name).join(', ');
            if (!window.confirm(`'${dept.name}'은(는) 하위 부서(${childNames})의 상위부서로 사용 중입니다.\n삭제하면 하위 부서의 상위부서가 비워집니다.\n\n삭제하시겠습니까?`)) return;

            // 자식들의 상위부서 비우기
            setDepartments(prev => prev
                .filter(d => d.id !== id)
                .map(d => d.parentName === dept.name ? { ...d, parentName: '' } : d)
            );
            return;
        }

        // 다른 화면에서 참조 중인지 확인
        try {
            const refs = [];
            const laborData = await api.getStore('clinic_payment');
            if (laborData && Array.isArray(laborData) && laborData.some(l => l.dept_code === dept.name)) {
                refs.push('사원소속');
            }
            const revenueData = await api.getStore('clinic_revenue');
            if (revenueData && Array.isArray(revenueData) && revenueData.some(r =>
                r.abc_order_dept === dept.name || r.abc_oper_dept === dept.name ||
                r.abc_order_dct === dept.name || r.abc_oper_dct === dept.name
            )) {
                refs.push('수익');
            }
            const costData = await api.getStore('clinic_expense');
            if (costData && Array.isArray(costData) && costData.some(c => c.dept_code === dept.name)) {
                refs.push('비용');
            }

            if (refs.length > 0) {
                if (!window.confirm(`'${dept.name}'은(는) [${refs.join(', ')}] 화면에서 사용 중입니다.\n삭제하시겠습니까?`)) return;
            }
        } catch (e) {
            console.error('참조 확인 실패:', e);
        }

        setDepartments(prev => prev.filter(d => d.id !== id));
    };


    // ── 부서/원가대상 저장 ──
    const saveData = async () => {
        // 무결성 검증
        if (validationErrors.length > 0) {
            const errorMessages = validationErrors.map(e => e.msg).join('\n');
            alert(`무결성 오류가 있습니다:\n\n${errorMessages}\n\n오류를 수정한 후 다시 저장해주세요.`);
            return;
        }

        try {
            const periodData = currentPeriod || { period_year: null, period_type: null, period_name: null };

            // 부서여부=true 항목 → clinic_departments_v2
            const deptItems = departments.filter(d => d.isDept).map(d => ({
                ...periodData,
                name: d.name,
                parent_name: d.parentName,
                level: d.level,
                is_dept: 1
            }));

            // 원가대상여부=true 항목 → clinic_costobject
            const costObjItems = departments.filter(d => d.isCostObj).map(d => ({
                ...periodData,
                name: d.name,
                parent_name: d.parentName,
                level: d.level,
                is_cost_obj: 1
            }));

            await api.saveDepartments(deptItems);
            await api.saveCostObject(costObjItems);

            alert('기초코드가 저장되었습니다.\n- 부서코드: ' + deptItems.length + '건\n- 원가대상: ' + costObjItems.length + '건');
        } catch (e) {
            alert('저장 실패: ' + e.message);
        }
    };

    // ── 표준 기초코드 저장 ──
    const saveStandardCodes = async () => {
        try {
            const periodData = currentPeriod || { period_year: null, period_type: null, period_name: null };
            
            await api.saveStandardActivities(stdActivities.map(d => ({ ...periodData, activity_type: d.type, activity_name: d.name })));
            await api.saveStandardJobs(stdJobs.map(d => ({ ...periodData, job_type: d.type, job_name: d.name })));
            await api.saveStandardAccounts(stdAccounts.map(d => ({ ...periodData, account_type: d.group, account_name: d.name })));
            await api.saveStandardDrivers(stdDrivers.map(d => ({ ...periodData, driver_type: d.type, driver_name: d.name })));
            
            alert('표준 기초코드가 저장되었습니다.');
            setIsStandardEditMode(false);
        } catch (e) {
            alert('저장 실패: ' + e.message);
        }
    };

    // ── 재사용 가능한 EditableTable 컴포넌트 (표준 코드용) ──
    const renderStandardTable = (title, data, setData, columns) => {
        return (
            <Card title={title} actions={isStandardEditMode && (
                <button onClick={() => {
                    const newId = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;
                    const newItem = { id: newId };
                    columns.forEach(c => newItem[c.key] = c.default || '');
                    setData([...data, newItem]);
                }} className="ui-btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                    <Plus size={14} /> 추가
                </button>
            )}>
                <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                    <table className="ui-table">
                        <colgroup>
                            <col style={{ width: '50px' }} />
                            {columns.map((c, i) => <col key={i} style={c.width ? { width: c.width } : undefined} />)}
                            {isStandardEditMode && <col style={{ width: '40px' }} />}
                        </colgroup>
                        <thead>
                            <tr>
                                <th>No</th>
                                {columns.map((c, i) => <th key={i}>{c.label}</th>)}
                                {isStandardEditMode && <th></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, idx) => (
                                <tr key={row.id}>
                                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                    {columns.map((col, cIdx) => (
                                        <td key={cIdx}>
                                            {isStandardEditMode ? (
                                                <input
                                                    type="text"
                                                    value={row[col.key] || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setData(prev => prev.map(d => d.id === row.id ? { ...d, [col.key]: val } : d));
                                                    }}
                                                    className={styles.cellInput}
                                                    placeholder={col.label}
                                                />
                                            ) : (
                                                row[col.key]
                                            )}
                                        </td>
                                    ))}
                                    {isStandardEditMode && (
                                        <td style={{ textAlign: 'center' }}>
                                            <button onClick={() => setData(prev => prev.filter(d => d.id !== row.id))} className="ui-btn-danger" style={{ padding: '4px' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        );
    };

    if (isLoading) {
        return <div className={styles.container}><p>데이터를 불러오는 중...</p></div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h2 className={styles.title}>기초코드 관리</h2>
                </div>
                <div className="ui-tab-container">
                    <button className={`ui-tab-button ${activeTab === 'dept' ? 'active' : ''}`} onClick={() => setActiveTab('dept')}>
                        부서/원가대상
                    </button>
                    <button className={`ui-tab-button ${activeTab === 'standard' ? 'active' : ''}`} onClick={() => setActiveTab('standard')}>
                        표준코드
                    </button>
                </div>
            </header>

            <div className="ui-subtitle-box">
                원가계산의 기초코드체계를 관리하는 화면입니다.<br />
                {activeTab === 'dept' ? (
                    <>
                        - 부서명, 상위부서명, 부서레벨을 입력하면 자동으로 트리를 구성합니다.<br />
                        - 부서는 비용이 집계되는 코드이며, 원가대상은 원가계산 결과가 집계되는 코드입니다.<br />
                        - 다른 화면에서 참조 중인 코드 삭제 시 경고가 표시됩니다.
                    </>
                ) : (
                    <>
                        - 원가계산에 필요한 표준화된 기초코드를 관리합니다.<br />
                        - 활동, 직종, 계정, 원가배부 값은 표준으로 사용됩니다.
                    </>
                )}
            </div>

            {activeTab === 'dept' && (
                <>
                    {validationErrors.length > 0 && (
                        <div className={styles.errorBox}>
                            <AlertTriangle size={16} />
                            <span>무결성 오류 {validationErrors.length}건: {validationErrors[0].msg}</span>
                            {validationErrors.length > 1 && <span className={styles.errorMore}>외 {validationErrors.length - 1}건</span>}
                        </div>
                    )}

                    {/* ── 부서/원가대상 테이블 + 트리 ── */}
                    <div className={styles.deptLayout}>
                        {/* 좌측: 테이블 */}
                        <div className={styles.card} style={{ flex: 3 }}>
                            <div className={styles.actionRow} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
                                <button onClick={addDepartment} className="ui-btn-secondary">
                                    <Plus size={16} /> 추가
                                </button>
                                <button onClick={saveData} className="ui-btn-primary">
                                    <Save size={16} /> 저장
                                </button>
                                <button onClick={() => exportToExcel(departments.map(d => ({
                                    부서명: d.name, 상위부서명: d.parentName, 부서레벨: d.level,
                                    부서여부: d.isDept ? 'Y' : 'N', 원가대상여부: d.isCostObj ? 'Y' : 'N'
                                })), '기초코드_부서정의')} className="ui-btn-secondary">
                                    <FileDown size={16} /> 다운로드
                                </button>
                            </div>
                            <div className={styles.tableWrapper}>
                                <table className="ui-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 50 }}>No</th>
                                            <th>부서명</th>
                                            <th>상위부서명</th>
                                            <th style={{ width: 80 }}>부서레벨</th>
                                            <th style={{ width: 80 }}>부서여부</th>
                                            <th style={{ width: 90 }}>원가대상여부</th>
                                            <th style={{ width: 50 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {departments.map((dept, index) => {
                                            const hasError = validationErrors.some(e => e.row === index + 1);
                                            return (
                                                <tr key={dept.id} style={hasError ? { background: 'rgba(239,68,68,0.05)' } : undefined}>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={dept.name}
                                                            onChange={(e) => updateDepartment(dept.id, 'name', e.target.value)}
                                                            className={styles.cellInput}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={dept.parentName}
                                                            onChange={(e) => updateDepartment(dept.id, 'parentName', e.target.value)}
                                                            className={styles.cellInput}
                                                        >
                                                            <option value="">- 없음 (최상위) -</option>
                                                            {parentOptions.filter(n => n && n !== dept.name).map(n => (
                                                                <option key={n} value={n}>{n}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={dept.level}
                                                            onChange={(e) => updateDepartment(dept.id, 'level', parseInt(e.target.value) || 1)}
                                                            className={styles.cellInput}
                                                            style={{ textAlign: 'center' }}
                                                            min={1}
                                                            max={10}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={dept.isDept}
                                                            onChange={(e) => updateDepartment(dept.id, 'isDept', e.target.checked)}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={dept.isCostObj}
                                                            onChange={(e) => updateDepartment(dept.id, 'isCostObj', e.target.checked)}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button onClick={() => removeDepartment(dept.id)} className="ui-btn-danger" title="삭제">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 우측: 트리 미리보기 */}
                        <div className={styles.card} style={{ flex: 1, minWidth: 260 }}>
                            <div className={styles.summaryTitle} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: 800 }}>
                                조직 트리
                            </div>
                            <div className={styles.treeContainer}>
                                {treeData.length > 0 ? (
                                    treeData.map(node => (
                                        <TreeNode key={node.id || node.name} node={node} />
                                    ))
                                ) : (
                                    <p className={styles.treeEmpty}>부서를 추가하면 트리가 표시됩니다.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'standard' && (
                <div>
                    <div className={styles.standardGrid}>
                        {renderStandardTable('활동 (Activity)', stdActivities, setStdActivities, [
                            { key: 'type', label: '활동유형', default: '활동', width: '100px' },
                            { key: 'name', label: '활동명' }
                        ])}
                        
                        {renderStandardTable('직종 (Job)', stdJobs, setStdJobs, [
                            { key: 'type', label: '직종유형', default: '직종', width: '100px' },
                            { key: 'name', label: '직종명' }
                        ])}
                        
                        {renderStandardTable('계정 (Account)', stdAccounts, setStdAccounts, [
                            { key: 'group', label: '계정분류', width: '120px' },
                            { key: 'name', label: '계정명' }
                        ])}
                        
                        {renderStandardTable('원가 배부 값 (Drivers)', stdDrivers, setStdDrivers, [
                            { key: 'type', label: '구분', width: '120px' },
                            { key: 'name', label: '드라이버' }
                        ])}
                    </div>

                    <div className={styles.actionRow} style={{ padding: '16px 0 0 0', marginTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto', fontWeight: 600, cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={isStandardEditMode} 
                                onChange={(e) => setIsStandardEditMode(e.target.checked)} 
                                style={{ width: 16, height: 16 }}
                            />
                            관리자 편집 모드 활성화
                        </label>
                        {isStandardEditMode && (
                            <button onClick={saveStandardCodes} className="ui-btn-primary">
                                <Save size={16} /> 변경사항 저장
                            </button>
                        )}
                        <button
                            className="ui-btn-secondary"
                            onClick={() => {
                                const combined = [
                                    ...stdActivities.map(a => ({ 구분: '활동', 유형: a.type, 이름: a.name })),
                                    ...stdJobs.map(j => ({ 구분: '직종', 유형: j.type, 이름: j.name })),
                                    ...stdAccounts.map(ac => ({ 구분: '계정', 분류: ac.group, 이름: ac.name })),
                                    ...stdDrivers.map(d => ({ 구분: '드라이버', 타입: d.type, 이름: d.name }))
                                ];
                                exportToExcel(combined, '표준기초코드');
                            }}
                        >
                            <FileDown size={16} /> 데이터 다운로드
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SetupPage;
