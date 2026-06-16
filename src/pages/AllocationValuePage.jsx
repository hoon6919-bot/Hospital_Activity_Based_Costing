import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Save, Play, Plus, FileDown, Trash2, Filter, Upload, FileSpreadsheet, Database, CheckCircle, X } from 'lucide-react';
import styles from './AllocationValuePage.module.css';
import { exportToExcel, importFromExcel } from '../utils/excelExport';
import { api } from '../api';
import { PeriodContext } from '../contexts/PeriodContext';

const SOURCE_TABLE_MAPPING = {
    '수익': 'clinic_revenue',
    '환자통계': 'clinic_patient_stats',
    '사원소속': 'clinic_payment',
    '비용': 'clinic_expense'
};

const VALUE_FIELDS_MAPPING = {
    '수익': [ { value: 'amount', label: '금액' } ],
    '환자통계': [ { value: 'value', label: '값' } ],
    '사원소속': [ { value: 'headcount', label: '인원수' }, { value: 'total_amount', label: '총인건비' } ],
    '비용': [ { value: 'amount', label: '금액' } ]
};

const COLUMN_LABEL_DICT = {
    suga_category: '수가분류',
    account_category: '계정분류',
    account_code: '계정코드',
    abc_order_dept: '진료과',
    abc_oper_dept: '시행과',
    abc_order_dct: '처방의사',
    abc_oper_dct: '시행의사',
    driver_code: '통계항목명',
    dept_code: '부서',
    dept: '부서',
    dept_name: '부서명',
    job_type: '직종',
    emp_name: '사원명',
    patient_in_out: '환자구분',
    patient_reg_no: '등록번호',
    patient_no: '환자번호',
    suga_code: '수가코드',
    suga_name: '수가명',
    amount: '금액',
    value: '값',
    headcount: '인원수',
    avg_salary: '평균급여',
    total_amount: '총인건비',
    account_name: '계정명',
    costing_yn: '원가계산여부',
    order_date: '처방일자',
    registration_date: '접수일자',
    discharge_date: '퇴원일자'
};

const DEFAULT_RULES = [];

const AllocationValuePage = () => {
    const { currentPeriod } = React.useContext(PeriodContext);
    const [activeTab, setActiveTab] = useState('input'); // 'input' | 'summary' | 'results'
    const [rules, setRules] = useState([]);
    const [driverData, setDriverData] = useState([]);
    const [standardDrivers, setStandardDrivers] = useState([]);
    const [sourceFields, setSourceFields] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const [selectedRuleIds, setSelectedRuleIds] = useState([]);
    const [selectedResultIds, setSelectedResultIds] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const [resultTypeFilter, setResultTypeFilter] = useState('원가대상');
    const [resultDriverFilter, setResultDriverFilter] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRuleForModal, setSelectedRuleForModal] = useState(null);
    const fileInputRef = useRef(null);
    const [costObjectDepts, setCostObjectDepts] = useState([]);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

    // 1. 기초 코드(표준 드라이버) 및 데이터 조회
    useEffect(() => {
        const fetchData = async () => {
            if (!currentPeriod?.period_year) return;
            setIsLoading(true);
            try {
                const year = currentPeriod.period_year;
                const name = currentPeriod.period_name;

                // 표준 드라이버 목록 조회 (기초코드)
                const stdData = await api.getStandardDrivers(year, name);
                setStandardDrivers(stdData || []);

                // 원가대상 목록 조회 (기초코드)
                const costObjs = await api.getCostObject().catch(() => []);
                setCostObjectDepts(costObjs ? costObjs.map(c => c.name) : []);

                // 동적 필드 조회 (조건필드 드롭박스용)
                const fieldsMap = {};
                for (const source of Object.keys(SOURCE_TABLE_MAPPING)) {
                    const tableName = SOURCE_TABLE_MAPPING[source];
                    try {
                        const cols = await api.getTableColumns(tableName);
                        fieldsMap[source] = cols.map(c => ({ value: c, label: COLUMN_LABEL_DICT[c] || c }));
                    } catch (e) {
                        console.error('Failed to fetch columns for ' + tableName, e);
                        fieldsMap[source] = [];
                    }
                }
                setSourceFields(fieldsMap);

                // 설정된 규칙 조회
                const fetchedRules = await api.getRules(year, name);
                if (fetchedRules && fetchedRules.length > 0) {
                    setRules(fetchedRules.map(r => ({
                        ...r,
                        condition_field: r.condition_field || '',
                        condition_value: r.condition_value || ''
                    })));
                } else {
                    setRules(DEFAULT_RULES);
                }

                // 생성된 드라이버 데이터 조회
                const fetchedDriverData = await api.getDriverData(year, name);
                if (fetchedDriverData && fetchedDriverData.length > 0) {
                    setDriverData(fetchedDriverData.map(row => ({
                        ...row,
                        driver_code: row.driver_code || '',
                        dept_code: row.dept_code || '',
                        abc_order_dept: row.abc_order_dept || '',
                        abc_oper_dept: row.abc_oper_dept || '',
                        abc_order_dct: row.abc_order_dct || '',
                        abc_oper_dct: row.abc_oper_dct || '',
                        value: row.value || 0
                    })));
                } else {
                    setDriverData([]);
                }
            } catch (error) {
                console.error("데이터 로드 실패:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [currentPeriod]);

    // 구분(Type)에 따른 선택 가능 드라이버 목록 필터링 (clinic_driver 기준)
    const getDriverOptions = (type, currentDriver) => {
        const drivers = standardDrivers
            .filter(d => d.driver_type === type)
            .map(d => d.driver_name);

        // 중복 제거
        const uniqueDrivers = [...new Set(drivers)];

        // 현재 선택된 값이 목록에 없으면 추가 (기존 데이터 유지)
        if (currentDriver && !uniqueDrivers.includes(currentDriver)) {
            uniqueDrivers.push(currentDriver);
        }

        return uniqueDrivers;
    };

    // 공통: 조건 필터 적용
    const applyCondition = (data, field, value) => {
        if (!field || !value) return data;
        return data.filter(item => String(item[field] || '').trim() === String(value).trim());
    };

    const handleAddRule = () => {
        const newRule = {
            id: Date.now(),
            type: '원가대상',
            source: '수익',
            driver: getDriverOptions('원가대상')[0] || '',
            valueType: 'amount',
            condition_field: '',
            condition_value: '',
            note: '',
            status: '대기',
            successCount: 0,
            errorCount: 0,
            errorNote: ''
        };
        setRules([...rules, newRule]);
    };

    const handleDeleteRules = () => {
        if (selectedRuleIds.length === 0) return alert('삭제할 항목을 선택하세요.');
        setRules(rules.filter(r => !selectedRuleIds.includes(r.id)));
        setSelectedRuleIds([]);
    };

    const handleSaveRules = async () => {
        if (!currentPeriod?.period_year) return alert('회계기간이 선택되지 않았습니다.');
        setIsSaving(true);
        try {
            await api.saveRules(currentPeriod.period_year, currentPeriod.period_name, rules);
            alert('규칙이 DB에 저장되었습니다.');
        } catch (error) {
            alert('저장에 실패했습니다.');
            console.error(error);
        }
        setIsSaving(false);
    };

    // [기준보기] 모달 띄우기 로직
    const handleViewCriteria = async (driverName, type) => {
        if (!currentPeriod?.period_year) return alert('회계기간이 선택되지 않았습니다.');
        const rule = rules.find(r => r.driver === driverName && r.type === type);
        if (!rule) return alert('해당 드라이버의 생성 규칙을 찾을 수 없습니다.');

        try {
            const year = currentPeriod.period_year;
            const name = currentPeriod.period_name;
            let sourceDataRaw = [];

            if (rule.source === '수익') sourceDataRaw = await api.getRevenueData(year, name);
            else if (rule.source === '비용') sourceDataRaw = await api.getExpenseData(year, name);
            else if (rule.source === '사원소속') sourceDataRaw = await api.getPayment(year, name);
            else if (rule.source === '환자통계') sourceDataRaw = await api.getPatientStats(year, name);

            // 필드 표준화 보정
            const sourceData = sourceDataRaw.map(r => ({
                ...r,
                abc_order_dept: r.abc_order_dept || r.treatDept || r.dept || '',
                abc_oper_dept: r.abc_oper_dept || r.execDept || r.performDept || '',
                abc_order_dct: r.abc_order_dct || r.prescDoc || r.treatDoc || '',
                abc_oper_dct: r.abc_oper_dct || r.performDoc || r.execDoc || '',
                driver_code: r.driver_code || r.driver || '',
                dept_code: r.dept_code || r.dept || '',
                suga_category: r.suga_category || r.actMaterial || '',
                account_category: r.account_category || r.accCategory || '',
                account_code: r.account_code || r.account || '',
                amt: parseFloat(r.amt || r.amount || 0),
                value: parseFloat(r.value || 0)
            }));

            const filtered = applyCondition(sourceData, rule.condition_field, rule.condition_value);
            const totalVal = filtered.reduce((acc, curr) => acc + (parseFloat(curr[rule.valueType] || curr.amt || curr.value || curr.total_amount || 0)), 0);

            // 동적 SQL 생성
            const tableName = SOURCE_TABLE_MAPPING[rule.source] || 'clinic_' + rule.source;
            const valField = rule.valueType || 'value';
            const groupByCols = rule.type === '부서' ? ['dept_code'] : ['abc_order_dept', 'abc_oper_dept', 'abc_order_dct', 'abc_oper_dct'];
            const sqlText = `SELECT \n    period_name, \n    '${rule.driver}' as driver_name, \n    ${groupByCols.join(', ')}, \n    SUM(${valField}) as total_value \nFROM ${tableName} \nWHERE ${rule.condition_field || '1'} = '${rule.condition_value || '1'}' \n  AND period_name = '${name}' \nGROUP BY \n    period_name, \n    '${rule.driver}', \n    ${groupByCols.join(', ')}`;

            setSelectedRuleForModal({
                ...rule,
                matchCount: filtered.length,
                totalAmount: totalVal,
                sql_text: sqlText
            });
            setIsModalOpen(true);
        } catch (e) {
            console.error(e);
            alert('기초 데이터를 불러오는 중 오류가 발생했습니다.');
        }
    };

    // === 드라이버 생성 로직 (Generate) ===
    const handleGenerate = async () => {
        if (!currentPeriod?.period_year) return alert('회계기간이 선택되지 않았습니다.');
        if (selectedRuleIds.length === 0) return alert('생성할 드라이버를 선택해주세요.');

        setIsGenerating(true);
        try {
            const year = currentPeriod.period_year;
            const name = currentPeriod.period_name;

            // 1. 필요한 기초 데이터 모두 로드
            const revenueDataRaw = await api.getRevenueData(year, name).catch(() => []);
            const laborDataRaw = await api.getPayment(year, name).catch(() => []);
            const statsDataRaw = await api.getPatientStats(year, name).catch(() => []);
            const costDataRaw = await api.getExpenseData(year, name).catch(() => []);

            // 2. 필드 표준화 보정 (기존 로직과 동일하게 맞춤)
            const revenueData = revenueDataRaw.map(r => ({
                ...r,
                abc_order_dept: r.abc_order_dept || '', abc_oper_dept: r.abc_oper_dept || '',
                abc_order_dct: r.abc_order_dct || '', abc_oper_dct: r.abc_oper_dct || '',
                suga_category: r.suga_category || '', account_code: r.account_code || ''
            }));
            const laborData = laborDataRaw.map(r => ({
                ...r, dept_code: r.dept_code || ''
            }));
            const statsData = statsDataRaw.map(r => ({
                ...r, abc_order_dept: r.abc_order_dept || '', abc_oper_dept: r.abc_oper_dept || '',
                abc_order_dct: r.abc_order_dct || '', abc_oper_dct: r.abc_oper_dct || '',
                driver_code: r.driver_code || ''
            }));
            const costData = costDataRaw.map(r => ({
                ...r, dept_code: r.dept_code || '', account_code: r.account_code || ''
            }));

            const rulesToProcess = rules.filter(r => selectedRuleIds.includes(r.id));
            const updatedRules = [...rules];
            let newGeneratedRows = [];

            rulesToProcess.forEach(rule => {
                let successCount = 0, errorCount = 0;
                const targetRule = updatedRules.find(r => r.id === rule.id);
                targetRule.errorNote = '';

                const sourceData = rule.source === '수익' ? revenueData :
                    rule.source === '환자통계' ? statsData :
                        rule.source === '사원소속' ? laborData :
                            rule.source === '비용' ? costData : [];

                const filteredSource = applyCondition(sourceData, rule.condition_field, rule.condition_value);

                if (filteredSource.length === 0) {
                    targetRule.status = '오류';
                    targetRule.errorNote = '매칭되는 기초 데이터가 없습니다.';
                    targetRule.sql_text = `SELECT ... \nFROM ${SOURCE_TABLE_MAPPING[rule.source] || 'clinic_' + rule.source} \nWHERE ${rule.condition_field || '1'} = '${rule.condition_value || '1'}' \n-- (결과 0건)`;
                } else {
                    const aggregatedData = {};
                    let groupByCols = rule.type === '부서' ? ['dept_code'] : ['abc_order_dept', 'abc_oper_dept', 'abc_order_dct', 'abc_oper_dct'];

                    filteredSource.forEach(item => {
                        if (rule.type === '부서') {
                            const dept = item.dept_code || item.dept || item.dept_name || '';
                            if (dept) {
                                if (!aggregatedData[dept]) aggregatedData[dept] = { dept_code: dept, value: 0 };
                                let val = parseFloat(item[rule.valueType] || item.value || item.amount || item.total_amount || item.headcount || item.amt || item.qty || 0);
                                aggregatedData[dept].value += val;
                                successCount++;
                            } else errorCount++;
                        } else {
                            const dims = groupByCols;
                            const key = dims.map(d => item[d] || '').join('|');
                            if (!aggregatedData[key]) {
                                aggregatedData[key] = {
                                    abc_order_dept: item.abc_order_dept || '',
                                    abc_oper_dept: item.abc_oper_dept || '',
                                    abc_order_dct: item.abc_order_dct || '',
                                    abc_oper_dct: item.abc_oper_dct || '',
                                    value: 0
                                };
                            }
                            aggregatedData[key].value += parseFloat(item[rule.valueType] || item.value || item.amount || item.total_amount || item.headcount || item.amt || item.qty || 0);
                            successCount++;
                        }
                    });

                    Object.values(aggregatedData).forEach(agg => {
                        newGeneratedRows.push({ id: Math.random(), type: rule.type, driver_code: rule.driver, ...agg });
                    });

                    targetRule.successCount = successCount;
                    targetRule.errorCount = errorCount;
                    targetRule.status = errorCount > 0 ? '오류' : '정상';
                    if (errorCount > 0) targetRule.errorNote = `${errorCount}건의 필수 정보가 누락되었습니다.`;

                    // SQL 문장 저장용 기록 (화면 전시용)
                    targetRule.sql_text = `SELECT \n    period_name, \n    '${rule.driver}' as driver_name, \n    ${groupByCols.join(', ')}, \n    SUM(${rule.valueType || 'value'}) as total_value \nFROM ${SOURCE_TABLE_MAPPING[rule.source] || 'clinic_' + rule.source} \nWHERE ${rule.condition_field || '1'} = '${rule.condition_value || '1'}' \n  AND period_name = '${name}' \nGROUP BY \n    period_name, \n    '${rule.driver}', \n    ${groupByCols.join(', ')}`;
                }
            });

            // 생성된 데이터 기존 배열과 병합 (이번에 생성한 드라이버와 동일한 이름의 기존 데이터는 삭제)
            const processedDriverNames = rulesToProcess.map(r => r.driver);
            const finalData = [...driverData.filter(d => !processedDriverNames.includes(d.driver_code)), ...newGeneratedRows];

            setRules(updatedRules);
            setDriverData(finalData);

            // 즉시 DB 저장
            await api.saveRules(year, name, updatedRules);
            await api.saveDriverData(year, name, finalData);

            alert('생성 및 저장이 완료되었습니다.');
        } catch (e) {
            console.error(e);
            alert('생성 중 오류가 발생했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    // === 드라이버 결과 핸들러 ===
    const handleResultSelectAll = (e) => {
        const filtered = driverData.filter(d => d.type === resultTypeFilter && (!resultDriverFilter || d.driver_code === resultDriverFilter));
        if (e.target.checked) setSelectedResultIds(filtered.map(r => r.id));
        else setSelectedResultIds([]);
    };

    const handleResultSelect = (id) => {
        if (selectedResultIds.includes(id)) setSelectedResultIds(selectedResultIds.filter(i => i !== id));
        else setSelectedResultIds([...selectedResultIds, id]);
    };

    const handleAddResultRow = () => {
        const newRow = {
            id: Date.now(),
            type: resultTypeFilter,
            driver_code: resultDriverFilter || '',
            abc_order_dept: '',
            abc_oper_dept: '',
            abc_order_dct: '',
            abc_oper_dct: '',
            dept_code: '',
            value: 0,
            note: ''
        };
        setDriverData([newRow, ...driverData]);
    };

    const handleDeleteResultRows = () => {
        if (selectedResultIds.length === 0) return alert('삭제할 항목을 선택하세요.');
        setDriverData(driverData.filter(d => !selectedResultIds.includes(d.id)));
        setSelectedResultIds([]);
    };

    const updateDriverResult = (id, field, value) => {
        setDriverData(driverData.map(d => d.id === id ? { ...d, [field]: value } : d));
    };

    const handleSaveDriverResults = async () => {
        if (!currentPeriod?.period_year) return alert('회계기간을 먼저 설정해주세요.');
        try {
            await api.saveDriverData(currentPeriod.period_year, currentPeriod.period_name, driverData);
            alert('드라이버 결과 데이터가 저장되었습니다.');
        } catch (e) {
            alert('저장 실패');
        }
    };

    const downloadExcelTemplate = () => {
        const templateData = [{
            '구분': '원가대상',
            '드라이버명': '',
            '부서': '',
            '진료과': '',
            '시행과': '',
            '처방의사': '',
            '시행의사': '',
            '값': 0,
            '비고': ''
        }];
        exportToExcel(templateData, '드라이버결과_업로드양식');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await importFromExcel(file);
            if (data && data.length > 0) {
                const mappedData = data.map((row, idx) => ({
                    id: Date.now() + idx,
                    type: row['구분'] || row.type || '원가대상',
                    driver_code: row['드라이버명'] || row.driver_code || '',
                    dept_code: row['부서'] || row.dept_code || '',
                    abc_order_dept: row['진료과'] || row.abc_order_dept || '',
                    abc_oper_dept: row['시행과'] || row.abc_oper_dept || '',
                    abc_order_dct: row['처방의사'] || row.abc_order_dct || '',
                    abc_oper_dct: row['시행의사'] || row.abc_oper_dct || '',
                    value: Number(row['값'] || row.value || 0),
                    note: row['비고'] || row.note || ''
                }));
                setDriverData([...mappedData, ...driverData]);
                alert(`${mappedData.length}건의 데이터를 성공적으로 불러왔습니다.`);
            } else {
                alert("불러올 데이터가 없습니다. 엑셀 파일을 확인해주세요.");
            }
        } catch (err) {
            console.error(err);
            alert("엑셀 파일을 읽는 중 오류가 발생했습니다.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const downloadDriverResults = () => {
        if (!currentPeriod) return alert('회계기간이 없습니다.');
        const exportData = driverData.map(row => ({
            '회계기간': currentPeriod.period_year,
            '기간유형': currentPeriod.period_type || 'Year',
            '기간명': currentPeriod.period_name,
            '구분': row.type,
            '드라이버명': row.driver_code,
            '부서': row.dept_code,
            '진료과': row.abc_order_dept,
            '시행과': row.abc_oper_dept,
            '처방의사': row.abc_order_dct,
            '시행의사': row.abc_oper_dct,
            '값': row.value,
            '비고': row.note
        }));
        exportToExcel(exportData, `드라이버결과_${currentPeriod.period_name}`);
    };

    // === 요약 통계 ===
    const getDriverUnit = (driverName) => {
        if (!driverName) return '';
        if (driverName.includes('비용') || driverName.includes('수익') || driverName.includes('비(') || driverName.includes('인건비') || driverName.includes('재료비') || driverName.includes('상각비') || driverName.includes('관리비') || driverName.includes('금액')) return '원';
        if (driverName.includes('시간')) return '분';
        if (driverName.includes('건')) return '건';
        if (driverName.includes('인원') || driverName.includes('환자수')) return '명';
        return '';
    };

    const topSummaries = useMemo(() => {
        const agg = (type) => {
            const data = driverData.filter(d => d.type === type);
            const map = {};
            data.forEach(d => {
                const key = d.driver_code || '미지정';
                map[key] = (map[key] || 0) + parseFloat(d.value || 0);
            });
            return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        };
        return {
            '원가대상': agg('원가대상'),
            '부서': agg('부서')
        };
    }, [driverData]);

    const summaries = useMemo(() => {
        const typeFiltered = driverData.filter(d => d.type === resultTypeFilter);
        const filteredData = resultDriverFilter ? typeFiltered.filter(d => d.driver_code === resultDriverFilter) : typeFiltered;

        const aggregate = (data, dim) => {
            const map = {};
            data.forEach(d => { const key = d[dim] || '미지정'; map[key] = (map[key] || 0) + parseFloat(d.value || 0); });
            const total = Object.values(map).reduce((a, b) => a + b, 0);
            return {
                data: Object.entries(map).map(([name, value]) => ({
                    name, value, ratio: total > 0 ? (value / total * 100).toFixed(1) : 0
                })).sort((a, b) => b.value - a.value),
                total
            };
        };

        return {
            driverOptions: [...new Set(typeFiltered.map(d => d.driver_code))],
            driverSummary: aggregate(typeFiltered, 'driver_code'),
            distributions: {
                '부서': aggregate(filteredData, 'dept_code'),
                '진료과': aggregate(filteredData, 'abc_order_dept'),
                '시행과': aggregate(filteredData, 'abc_oper_dept'),
                '처방의사': aggregate(filteredData, 'abc_order_dct'),
                '시행의사': aggregate(filteredData, 'abc_oper_dct')
            }
        };
    }, [driverData, resultTypeFilter, resultDriverFilter]);

    if (isLoading) return <div style={{ padding: '20px' }}>Loading...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}><h2 className={styles.title}>원가배부값 설정</h2></div>
                <div className="ui-tab-container">
                    <button className={`ui-tab-button ${activeTab === 'input' ? 'active' : ''}`} onClick={() => setActiveTab('input')}>드라이버 정의</button>
                    <button className={`ui-tab-button ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>드라이버 요약</button>
                    <button className={`ui-tab-button ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>드라이버 결과</button>
                </div>
            </header>

            <div className="ui-subtitle-box">
                비용 배부를 위한 기준(Driver)을 생성하고 관리합니다.<br />
                {activeTab === 'input' && (
                    <>- 배부 기준(동인)을 생성하기 위한 규칙을 정의합니다. 생성 버튼을 클릭하면 기초 데이터에서 값을 집계합니다.</>
                )}
            </div>

            {activeTab === 'input' ? (
                <div className={styles.card}>
                    <div className={styles.actions} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
                        <button className="ui-btn-secondary" onClick={handleAddRule}><Plus size={16} /> 추가</button>
                        <button className="ui-btn-primary" onClick={handleSaveRules} disabled={isSaving}><Save size={16} /> 저장</button>
                        <button className="ui-btn-secondary" onClick={() => exportToExcel(rules, '드라이버정의')}><FileDown size={16} /> 다운로드</button>
                        <button className="ui-btn-primary" style={{ background: '#3b82f6' }} onClick={handleGenerate} disabled={isGenerating || selectedRuleIds.length === 0}><Play size={16} /> 생성</button>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className="ui-table">
                            <thead>
                                <tr>
                                    <th><input type="checkbox" className={styles.checkbox} onChange={(e) => setSelectedRuleIds(e.target.checked ? rules.map(r => r.id) : [])} /></th>
                                    <th>구분</th><th>드라이버명</th><th>생성기준</th><th>값 유형</th><th>조건 필드</th><th>조건 값</th><th>상태</th><th>성공</th><th>오류</th><th>기준</th><th style={{ width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map(rule => (
                                    <tr key={rule.id}>
                                        <td><input type="checkbox" className={styles.checkbox} checked={selectedRuleIds.includes(rule.id)} onChange={() => setSelectedRuleIds(prev => prev.includes(rule.id) ? prev.filter(i => i !== rule.id) : [...prev, rule.id])} /></td>
                                        <td>
                                            <select className={styles.selectField} value={rule.type} onChange={(e) => setRules(rules.map(r => r.id === rule.id ? { ...r, type: e.target.value, driver: getDriverOptions(e.target.value)[0] || '' } : r))}>
                                                <option value="원가대상">원가대상</option><option value="부서">부서</option>
                                            </select>
                                        </td>
                                        <td>
                                            <select className={styles.selectField} value={rule.driver} onChange={(e) => setRules(rules.map(r => r.id === rule.id ? { ...r, driver: e.target.value } : r))}>
                                                {getDriverOptions(rule.type, rule.driver).map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <select className={styles.selectField} value={rule.source} onChange={(e) => setRules(rules.map(r => r.id === rule.id ? { ...r, source: e.target.value, condition_field: '', condition_value: '', valueType: VALUE_FIELDS_MAPPING[e.target.value]?.[0]?.value || '' } : r))}>
                                                {Object.keys(SOURCE_TABLE_MAPPING).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <select className={styles.selectField} value={rule.valueType} onChange={(e) => setRules(rules.map(r => r.id === rule.id ? { ...r, valueType: e.target.value } : r))}>
                                                {(VALUE_FIELDS_MAPPING[rule.source] || []).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <select className={styles.selectField} value={rule.condition_field} onChange={(e) => setRules(rules.map(r => r.id === rule.id ? { ...r, condition_field: e.target.value } : r))}>
                                                <option value="">(전체)</option>
                                                {sourceFields[rule.source]?.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            {rule.condition_field ? (
                                                <input type="text" className={styles.inputField} style={{ width: '100px' }} value={rule.condition_value} onChange={(e) => setRules(rules.map(r => r.id === rule.id ? { ...r, condition_value: e.target.value } : r))} placeholder="조건값" />
                                            ) : <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>}
                                        </td>
                                        <td>
                                            {rule.status === '정상' ? <div className={styles.badgeSuccess}>정상</div> :
                                                rule.status === '오류' ? <div className={styles.badgeError}>오류</div> :
                                                    <div className={styles.badgeDefault}>대기</div>}
                                        </td>
                                        <td style={{ color: '#10b981', fontWeight: 500, textAlign: 'right' }}>{rule.successCount.toLocaleString()}</td>
                                        <td style={{ color: '#ef4444', fontWeight: 500, textAlign: 'right' }}>{rule.errorCount.toLocaleString()}</td>
                                        <td>
                                            <button className={styles.viewBtn} onClick={() => handleViewCriteria(rule.driver, rule.type)}>기준보기</button>
                                        </td>
                                        <td>
                                            <button className="ui-icon-btn" onClick={() => { setRules(rules.filter(r => r.id !== rule.id)); setSelectedRuleIds(prev => prev.filter(i => i !== rule.id)); }}><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'results' ? (
                <div className={styles.card}>
                    <div className={styles.actions} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Filter size={16} style={{ color: '#64748b' }} />
                            <select className={styles.summarySelect} style={{ width: '150px' }} value={resultTypeFilter} onChange={(e) => { setResultTypeFilter(e.target.value); setResultDriverFilter(''); }}>
                                <option value="원가대상">원가대상</option>
                                <option value="부서">부서</option>
                            </select>
                            <select className={styles.summarySelect} style={{ width: '200px' }} value={resultDriverFilter} onChange={(e) => setResultDriverFilter(e.target.value)}>
                                <option value="">전체 드라이버</option>
                                {[...new Set(driverData.filter(d => d.type === resultTypeFilter).map(d => d.driver_code))].map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="ui-btn-secondary" onClick={handleAddResultRow}><Plus size={16} /> 데이터 추가</button>
                            <button className="ui-btn-primary" onClick={handleSaveDriverResults}><Save size={16} /> 저장</button>
                            <button className="ui-btn-secondary" onClick={() => setIsDownloadModalOpen(true)}><FileDown size={16} /> 다운로드</button>
                            <button className="ui-btn-secondary" onClick={() => fileInputRef.current?.click()}><Upload size={16} /> 업로드</button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" style={{ display: 'none' }} />
                        </div>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className="ui-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>No</th>
                                    <th>구분</th><th>드라이버명</th>
                                    {resultTypeFilter === '부서' ? (
                                        <th>부서</th>
                                    ) : (
                                        <><th>진료과</th><th>시행과</th><th>처방의사</th><th>시행의사</th></>
                                    )}
                                    <th style={{ textAlign: 'right' }}>값</th><th>비고</th>
                                    <th style={{ width: '40px' }}></th>
                                </tr>
                            </thead>
                            {(() => {
                                const filteredResults = driverData.filter(d => d.type === resultTypeFilter && (!resultDriverFilter || d.driver_code === resultDriverFilter));
                                const totalSum = filteredResults.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0);
                                return (
                                    <>
                                        <tbody>
                                            {filteredResults.map((row, index) => (
                                                <tr key={row.id}>
                                                    <td style={{ textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                                                    <td><input className={styles.inputField} style={{ width: '80px', backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} value={row.type} readOnly /></td>
                                                    <td>
                                                        <select className={styles.selectField} value={row.driver_code} onChange={(e) => updateDriverResult(row.id, 'driver_code', e.target.value)}>
                                                            <option value="">선택</option>
                                                            {getDriverOptions(row.type, row.driver_code).map(d => <option key={d} value={d}>{d}</option>)}
                                                        </select>
                                                    </td>
                                                    {resultTypeFilter === '부서' ? (
                                                        <td><input type="text" className={styles.inputField} value={row.dept_code} onChange={(e) => updateDriverResult(row.id, 'dept_code', e.target.value)} /></td>
                                                    ) : (
                                                        <>
                                                            <td>
                                                                <select className={styles.selectField} value={row.abc_order_dept} onChange={(e) => updateDriverResult(row.id, 'abc_order_dept', e.target.value)}>
                                                                    {!costObjectDepts.includes(row.abc_order_dept) && row.abc_order_dept !== '' && <option value={row.abc_order_dept}>{row.abc_order_dept}</option>}
                                                                    <option value="">선택</option>
                                                                    {costObjectDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                                                </select>
                                                            </td>
                                                            <td>
                                                                <select className={styles.selectField} value={row.abc_oper_dept} onChange={(e) => updateDriverResult(row.id, 'abc_oper_dept', e.target.value)}>
                                                                    {!costObjectDepts.includes(row.abc_oper_dept) && row.abc_oper_dept !== '' && <option value={row.abc_oper_dept}>{row.abc_oper_dept}</option>}
                                                                    <option value="">선택</option>
                                                                    {costObjectDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                                                </select>
                                                            </td>
                                                            <td>
                                                                <select className={styles.selectField} value={row.abc_order_dct} onChange={(e) => updateDriverResult(row.id, 'abc_order_dct', e.target.value)}>
                                                                    {!costObjectDepts.includes(row.abc_order_dct) && row.abc_order_dct !== '' && <option value={row.abc_order_dct}>{row.abc_order_dct}</option>}
                                                                    <option value="">선택</option>
                                                                    {costObjectDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                                                </select>
                                                            </td>
                                                            <td>
                                                                <select className={styles.selectField} value={row.abc_oper_dct} onChange={(e) => updateDriverResult(row.id, 'abc_oper_dct', e.target.value)}>
                                                                    {!costObjectDepts.includes(row.abc_oper_dct) && row.abc_oper_dct !== '' && <option value={row.abc_oper_dct}>{row.abc_oper_dct}</option>}
                                                                    <option value="">선택</option>
                                                                    {costObjectDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                                                </select>
                                                            </td>
                                                        </>
                                                    )}
                                                    <td>
                                                        <input 
                                                            type="text" 
                                                            className={styles.inputField} 
                                                            style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }} 
                                                            value={Number(row.value).toLocaleString()} 
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/,/g, '');
                                                                updateDriverResult(row.id, 'value', val === '' ? 0 : parseFloat(val) || 0);
                                                            }} 
                                                        />
                                                    </td>
                                                    <td><input type="text" className={styles.inputField} value={row.note} onChange={(e) => updateDriverResult(row.id, 'note', e.target.value)} /></td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button className="ui-icon-btn" style={{ color: '#ef4444' }} onClick={() => setDriverData(driverData.filter(d => d.id !== row.id))}><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: '#f8fafc', borderTop: '1px solid #cbd5e1' }}>
                                                <td colSpan={resultTypeFilter === '부서' ? 4 : 7} style={{ textAlign: 'center', fontWeight: 600, color: '#0f172a', padding: '12px 16px' }}>총합계</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', padding: '12px 24px' }}>{totalSum.toLocaleString()}</td>
                                                <td colSpan="2"></td>
                                            </tr>
                                        </tfoot>
                                    </>
                                );
                            })()}
                        </table>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* 상단: 생성 현황 패널 2개 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className={styles.card}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}>
                                <Play size={16} color="#0f172a" style={{ fill: '#0f172a' }} />
                                <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 600 }}>원가대상 드라이버 생성 현황</h3>
                            </div>
                            <div className={styles.tableWrapper}>
                                <table className="ui-table">
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left' }}>드라이버 명</th>
                                            <th style={{ textAlign: 'right' }}>값 (기본단위)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topSummaries['원가대상'].map(item => (
                                            <tr key={item.name}>
                                                <td style={{ fontWeight: 500 }}>{item.name}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                    {item.value.toLocaleString()} {getDriverUnit(item.name)}
                                                </td>
                                            </tr>
                                        ))}
                                        {topSummaries['원가대상'].length === 0 && (
                                            <tr><td colSpan="2" style={{ textAlign: 'center', color: '#94a3b8' }}>데이터가 없습니다.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className={styles.card}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}>
                                <CheckCircle size={16} color="#0f172a" />
                                <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 600 }}>부서 드라이버 생성 현황</h3>
                            </div>
                            <div className={styles.tableWrapper}>
                                <table className="ui-table">
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left' }}>드라이버 명</th>
                                            <th style={{ textAlign: 'right' }}>값 (기본단위)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topSummaries['부서'].map(item => (
                                            <tr key={item.name}>
                                                <td style={{ fontWeight: 500 }}>{item.name}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                    {item.value.toLocaleString()} {getDriverUnit(item.name)}
                                                </td>
                                            </tr>
                                        ))}
                                        {topSummaries['부서'].length === 0 && (
                                            <tr><td colSpan="2" style={{ textAlign: 'center', color: '#94a3b8' }}>데이터가 없습니다.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 필터 바 */}
                    <div className={styles.card} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Filter size={16} color="#64748b" />
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>드라이버 구분 필터 :</span>
                            <select className={styles.selectField} style={{ minWidth: '150px', margin: 0 }} value={resultTypeFilter} onChange={(e) => { setResultTypeFilter(e.target.value); setResultDriverFilter(''); }}>
                                <option value="원가대상">원가대상 드라이버</option>
                                <option value="부서">부서 드라이버</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>드라이버명 :</span>
                            <select className={styles.selectField} style={{ minWidth: '150px', margin: 0 }} value={resultDriverFilter} onChange={(e) => setResultDriverFilter(e.target.value)}>
                                <option value="">선택</option>
                                {summaries.driverOptions.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* 상세 분포 */}
                    <div style={{ display: 'grid', gridTemplateColumns: resultTypeFilter === '원가대상' ? 'repeat(4, 1fr)' : '1fr', gap: '16px' }}>
                        {resultTypeFilter === '원가대상' ? (
                            ['진료과', '시행과', '처방의사', '시행의사'].map(dim => (
                                <div key={dim} className={styles.card}>
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc' }}>
                                        <Play size={14} style={{ fill: '#64748b', color: '#64748b' }} />
                                        <h3 style={{ margin: 0, fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{dim}</h3>
                                    </div>
                                    <div className={styles.tableWrapper}>
                                        <table className="ui-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ textAlign: 'left' }}>{dim}</th>
                                                    <th style={{ textAlign: 'right' }}>드라이버값</th>
                                                    <th style={{ textAlign: 'right' }}>비율</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summaries.distributions[dim].data.map((item, i) => (
                                                    <tr key={i}>
                                                        <td>{item.name}</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            {item.value.toLocaleString()} {resultDriverFilter ? getDriverUnit(resultDriverFilter) : ''}
                                                        </td>
                                                        <td style={{ textAlign: 'right', color: '#64748b' }}>{item.ratio}%</td>
                                                    </tr>
                                                ))}
                                                {summaries.distributions[dim].data.length === 0 && (
                                                    <tr><td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8' }}>데이터가 없습니다.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.card}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc' }}>
                                    <Play size={14} style={{ fill: '#64748b', color: '#64748b' }} />
                                    <h3 style={{ margin: 0, fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>부서</h3>
                                </div>
                                <div className={styles.tableWrapper}>
                                    <table className="ui-table">
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left' }}>부서</th>
                                                <th style={{ textAlign: 'right' }}>드라이버값</th>
                                                <th style={{ textAlign: 'right' }}>비율</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summaries.distributions['부서'].data.map((item, i) => (
                                                <tr key={i}>
                                                    <td>{item.name}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        {item.value.toLocaleString()} {resultDriverFilter ? getDriverUnit(resultDriverFilter) : ''}
                                                    </td>
                                                    <td style={{ textAlign: 'right', color: '#64748b' }}>{item.ratio}%</td>
                                                </tr>
                                            ))}
                                            {summaries.distributions['부서'].data.length === 0 && (
                                                <tr><td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8' }}>데이터가 없습니다.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'input' && isModalOpen && selectedRuleForModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#ffffff', width: '700px', borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Database size={20} color="#3b82f6" />
                                드라이버 생성 SQL <span style={{ color: '#64748b', fontWeight: 500, fontSize: '16px' }}>- {selectedRuleForModal.driver}</span>
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '6px', transition: 'all 0.2s'
                            }} onMouseOver={e => {e.currentTarget.style.color='#ef4444'; e.currentTarget.style.background='#fee2e2'}} onMouseOut={e => {e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.background='transparent'}}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '24px', background: '#ffffff' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px',
                                padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px'
                            }}>
                                <CheckCircle size={18} color="#16a34a" />
                                <span style={{ color: '#166534', fontSize: '14px', fontWeight: 500 }}>
                                    해당 조건으로 <strong style={{ color: '#15803d' }}>{selectedRuleForModal.matchCount?.toLocaleString() || 0}건</strong>의 기초 데이터가 매칭되었습니다.
                                </span>
                            </div>
                            <div style={{
                                background: '#1e293b', padding: '20px', borderRadius: '12px',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', overflowX: 'auto'
                            }}>
                                <pre style={{
                                    margin: 0, fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                    fontSize: '14px', color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: '1.6'
                                }}>
                                    <code style={{ color: '#38bdf8' }}>SELECT</code>{'\n'}
                                    <span style={{ color: '#94a3b8' }}>    period_name,</span>{'\n'}
                                    <span style={{ color: '#a78bfa' }}>    '{selectedRuleForModal.driver}'</span> <span style={{ color: '#38bdf8' }}>as</span> <span style={{ color: '#e2e8f0' }}>driver_name,</span>{'\n'}
                                    <span style={{ color: '#94a3b8' }}>    {selectedRuleForModal.type === '부서' ? 'dept_code' : 'abc_order_dept, abc_oper_dept, abc_order_dct, abc_oper_dct'},</span>{'\n'}
                                    <span style={{ color: '#38bdf8' }}>    SUM</span><span style={{ color: '#e2e8f0' }}>({selectedRuleForModal.valueType || 'value'})</span> <span style={{ color: '#38bdf8' }}>as</span> <span style={{ color: '#e2e8f0' }}>total_value</span>{'\n'}
                                    <code style={{ color: '#38bdf8' }}>FROM</code> <span style={{ color: '#cbd5e1' }}>{SOURCE_TABLE_MAPPING[selectedRuleForModal.source] || 'clinic_' + selectedRuleForModal.source}</span>{'\n'}
                                    <code style={{ color: '#38bdf8' }}>WHERE</code> <span style={{ color: '#cbd5e1' }}>{selectedRuleForModal.condition_field || '1'} = '{selectedRuleForModal.condition_value || '1'}'</span>{'\n'}
                                    <span style={{ color: '#38bdf8' }}>  AND</span> <span style={{ color: '#cbd5e1' }}>period_name = '{currentPeriod?.period_name}'</span>{'\n'}
                                    <code style={{ color: '#38bdf8' }}>GROUP BY</code>{'\n'}
                                    <span style={{ color: '#94a3b8' }}>    period_name,</span>{'\n'}
                                    <span style={{ color: '#a78bfa' }}>    '{selectedRuleForModal.driver}',</span>{'\n'}
                                    <span style={{ color: '#94a3b8' }}>    {selectedRuleForModal.type === '부서' ? 'dept_code' : 'abc_order_dept, abc_oper_dept, abc_order_dct, abc_oper_dct'}</span>
                                </pre>
                            </div>
                        </div>
                        <div style={{
                            padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
                            display: 'flex', justifyContent: 'flex-end', gap: '12px'
                        }}>
                            <button onClick={() => setIsModalOpen(false)} style={{
                                padding: '10px 20px', background: '#3b82f6', color: '#fff',
                                border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                                cursor: 'pointer', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                                transition: 'all 0.2s'
                            }} onMouseOver={e => e.currentTarget.style.background='#2563eb'} onMouseOut={e => e.currentTarget.style.background='#3b82f6'}>
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isDownloadModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '320px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>다운로드 선택</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={() => { downloadExcelTemplate(); setIsDownloadModalOpen(false); }}
                                style={{ padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 600 }}
                            >
                                <FileSpreadsheet size={18} color="#3b82f6" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>업로드 양식 다운로드</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>빈 엑셀 템플릿</div>
                                </div>
                            </button>
                            <button
                                onClick={() => { downloadDriverResults(); setIsDownloadModalOpen(false); }}
                                style={{ padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 600 }}
                            >
                                <FileDown size={18} color="#10b981" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>결과 데이터 다운로드</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>현재 입력된 전체 데이터</div>
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

export default AllocationValuePage;
