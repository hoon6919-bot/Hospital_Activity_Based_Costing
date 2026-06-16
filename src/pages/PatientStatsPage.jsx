import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { Save, Plus, Trash2, Edit3, FileBarChart, Filter, FileDown, Upload, FileSpreadsheet } from 'lucide-react';
import styles from './PatientStatsPage.module.css';
import { exportToExcel, importFromExcel } from '../utils/excelExport';
import { PeriodContext } from '../contexts/PeriodContext';
import { api } from '../api';

const PatientStatsPage = () => {
    const { currentPeriod, isPeriodLoading } = useContext(PeriodContext);
    const [activeTab, setActiveTab] = useState('input'); // 'input' or 'summary'
    const [selectedSummaryDriver, setSelectedSummaryDriver] = useState('전체'); // Filter for summary
    
    // Select box options
    const [standardDrivers, setStandardDrivers] = useState(['외래환자수', '검사환자수']);
    const [costObjectDepts, setCostObjectDepts] = useState(['정형외과', '외래검사실']);
    
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const fileInputRef = useRef(null);
    const [rows, setRows] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. 기초코드(원가대상, 표준드라이버) 로드
                const [costObjs, drivers] = await Promise.all([
                    api.getCostObject(),
                    api.getStandardDrivers()
                ]);

                let costObjNames = ['정형외과', '외래검사실', '정형1'];
                if (costObjs && costObjs.length > 0) {
                    costObjNames = costObjs.map(c => c.name);
                }
                setCostObjectDepts(costObjNames);

                let driverNames = ['외래환자수', '검사환자수'];
                if (drivers && drivers.length > 0) {
                    driverNames = drivers.map(d => d.driver_code);
                }
                setStandardDrivers(driverNames);

                // 2. 환자통계 데이터 로드 (currentPeriod 존재 시)
                if (currentPeriod && !isPeriodLoading) {
                    const stats = await api.getPatientStats(currentPeriod.period_year, currentPeriod.period_name);
                    if (stats && stats.length > 0) {
                        setRows(stats.map(s => ({
                            id: s.id,
                            driver_code: s.driver_code,
                            abc_order_dept: s.abc_order_dept,
                            abc_oper_dept: s.abc_oper_dept,
                            abc_order_dct: s.abc_order_dct,
                            abc_oper_dct: s.abc_oper_dct,
                            value: s.value,
                            note: s.note || ''
                        })));
                    } else {
                        setRows([]);
                    }
                }
            } catch (err) {
                console.error('Failed to load patient stats data', err);
            }
        };

        loadData();
    }, [currentPeriod, isPeriodLoading]);

    const handleInputChange = (id, field, value) => {
        setRows(prev => prev.map(row => {
            if (row.id === id) {
                const updatedVal = (field === 'value') ? (parseInt(value.toString().replace(/[^0-9]/g, '')) || 0) : value;
                return { ...row, [field]: updatedVal };
            }
            return row;
        }));
    };

    const addRow = () => {
        const newId = Date.now();
        setRows([...rows, {
            id: newId, 
            driver_code: standardDrivers[0] || '외래환자수', 
            abc_order_dept: costObjectDepts[0] || '정형외과', 
            abc_oper_dept: costObjectDepts[0] || '정형외과',
            abc_order_dct: costObjectDepts[0] || '정형외과', 
            abc_oper_dct: costObjectDepts[0] || '정형외과', 
            value: 0, 
            note: ''
        }]);
    };

    const deleteRow = (id) => setRows(rows.filter(r => r.id !== id));
    const handleSave = async () => {
        if (!currentPeriod) {
            alert('선택된 회계기간이 없습니다.');
            return;
        }
        try {
            const dataToSave = rows.map(r => ({
                period_year: currentPeriod.period_year,
                period_type: currentPeriod.period_type,
                period_name: currentPeriod.period_name,
                driver_code: r.driver_code,
                abc_order_dept: r.abc_order_dept,
                abc_oper_dept: r.abc_oper_dept,
                abc_order_dct: r.abc_order_dct,
                abc_oper_dct: r.abc_oper_dct,
                value: r.value || 0,
                note: r.note || ''
            }));
            await api.savePatientStats(currentPeriod.period_year, currentPeriod.period_name, dataToSave);
            alert(`[${currentPeriod.period_year}년 ${currentPeriod.period_name}] 환자통계 데이터가 저장되었습니다.`);
        } catch (err) {
            console.error(err);
            alert('저장에 실패했습니다.');
        }
    };

    const downloadTemplate = () => {
        const templateData = [{
            '회계기간': currentPeriod?.period_year || 2026,
            '기간유형': currentPeriod?.period_type || 'Year',
            '기간명': currentPeriod?.period_name || '2026_Year',
            '드라이버': standardDrivers[0] || '외래환자수', 
            '진료과': costObjectDepts[0] || '정형외과', 
            '시행과': costObjectDepts[0] || '정형외과', 
            '처방의사': costObjectDepts[0] || '정형외과', 
            '시행의사': costObjectDepts[0] || '정형외과', 
            '값': 100, 
            '비고': '예시 데이터입니다'
        }];
        exportToExcel(templateData, '환자통계_업로드양식');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await importFromExcel(file);
            if (data && data.length > 0) {
                const mappedData = data.map((row, idx) => ({
                    id: Date.now() + idx,
                    driver_code: row['드라이버'] || row.driver || row.driver_code || row.통계항목 || standardDrivers[0] || '외래환자수',
                    abc_order_dept: row['진료과'] || row.dept || row.dept_name || row.prescDept || row.treatDept || row.abc_order_dept || costObjectDepts[0] || '정형외과',
                    abc_oper_dept: row['시행과'] || row.performDept || row.abc_oper_dept || costObjectDepts[0] || '정형외과',
                    abc_order_dct: row['처방의사'] || row.prescDoc || row.treatDoc || row.abc_order_dct || costObjectDepts[0] || '정형외과',
                    abc_oper_dct: row['시행의사'] || row.performDoc || row.abc_oper_dct || costObjectDepts[0] || '정형외과',
                    value: Number(row['값'] || row.value || row.amount || row.통계값 || 0),
                    note: row['비고'] || row.note || ''
                }));
                setRows(mappedData);
                alert(`${mappedData.length}건의 환자통계 데이터를 성공적으로 불러왔습니다.\n[저장] 버튼을 눌러야 반영됩니다.`);
            } else {
                alert("불러올 데이터가 없습니다. 양식을 확인해주세요.");
            }
        } catch (err) {
            console.error(err);
            alert("파일을 읽는 중 오류가 발생했습니다.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };    // Summary Calculations
    const summaries = useMemo(() => {
        const calculateSum = (key, filterByDriver = true) => {
            const map = {};
            let total = 0;
            const filteredRows = (filterByDriver && selectedSummaryDriver !== '전체')
                ? rows.filter(r => r.driver_code === selectedSummaryDriver)
                : rows;

            filteredRows.forEach(row => {
                const val = row[key];
                if (val) {
                    map[val] = (map[val] || 0) + (row.value || 0);
                    total += (row.value || 0);
                }
            });
            return {
                data: Object.entries(map).map(([name, value]) => ({
                    name, value, ratio: total > 0 ? (value / total) * 100 : 0
                })).sort((a, b) => b.value - a.value),
                total
            };
        };

        return {
            driverFull: calculateSum('driver_code', false),
            abc_order_dept: calculateSum('abc_order_dept'),
            abc_oper_dept: calculateSum('abc_oper_dept'),
            abc_order_dct: calculateSum('abc_order_dct'),
            abc_oper_dct: calculateSum('abc_oper_dct'),
        };
    }, [rows, selectedSummaryDriver]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h2 className={styles.title}>환자 통계 관리</h2>
                </div>
                <div className="ui-tab-container">
                    <button className={`ui-tab-button ${activeTab === 'input' ? 'active' : ''}`} onClick={() => setActiveTab('input')}>
                        <Edit3 size={16} /> 데이터 입력
                    </button>
                    <button className={`ui-tab-button ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
                        <FileBarChart size={16} /> 데이터 요약
                    </button>
                </div>
            </header>

            <div className="ui-subtitle-box">
                외래, 입원, 수술 등 병원 활동의 물량 통계를 관리합니다.<br />
                {activeTab === 'input' && (
                    <>- 병원에서 관리되는 환자통계를 화면과 같이 입력합니다.</>
                )}
            </div>

            {activeTab === 'input' ? (
                <>
                    <div className={styles.card}>
                        <div className={styles.actions} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
                            <button className="ui-btn-secondary" onClick={addRow}><Plus size={16} /> 추가</button>
                            <button className="ui-btn-primary" onClick={handleSave}><Save size={16} /> 저장</button>
                            <button className="ui-btn-secondary" onClick={() => setIsDownloadModalOpen(true)}>
                                <FileDown size={16} /> 다운로드
                            </button>
                            <button className="ui-btn-secondary" onClick={() => fileInputRef.current?.click()}>
                                <Upload size={16} /> 업로드
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" style={{ display: 'none' }} />
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className="ui-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>No</th>
                                        <th className={styles.highlight} style={{ width: '160px' }}>통계구분</th>
                                        <th className={styles.highlight} style={{ width: '150px' }}>진료과</th>
                                        <th className={styles.highlight} style={{ width: '150px' }}>시행과</th>
                                        <th className={styles.highlight} style={{ width: '120px' }}>처방의사</th>
                                        <th className={styles.highlight} style={{ width: '120px' }}>시행의사</th>
                                        <th className={styles.highlight} style={{ width: '90px' }}>값</th>
                                        <th className={styles.highlight}>비고</th>
                                        <th style={{ width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => (
                                        <tr key={row.id}>
                                            <td className={styles.centerText}>{index + 1}</td>
                                            <td>
                                                <select className={styles.input} value={row.driver_code} onChange={(e) => handleInputChange(row.id, 'driver_code', e.target.value)}>
                                                    {!standardDrivers.includes(row.driver_code) && row.driver_code !== '' && <option key={`custom-${row.driver_code}`} value={row.driver_code}>{row.driver_code}</option>}
                                                    {standardDrivers.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <select className={styles.input} value={row.abc_order_dept} onChange={(e) => handleInputChange(row.id, 'abc_order_dept', e.target.value)}>
                                                    {!costObjectDepts.includes(row.abc_order_dept) && row.abc_order_dept !== '' && <option key={`custom-${row.abc_order_dept}`} value={row.abc_order_dept}>{row.abc_order_dept}</option>}
                                                    {costObjectDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <select className={styles.input} value={row.abc_oper_dept} onChange={(e) => handleInputChange(row.id, 'abc_oper_dept', e.target.value)}>
                                                    {!costObjectDepts.includes(row.abc_oper_dept) && row.abc_oper_dept !== '' && <option key={`custom-${row.abc_oper_dept}`} value={row.abc_oper_dept}>{row.abc_oper_dept}</option>}
                                                    {costObjectDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <select className={styles.input} value={row.abc_order_dct} onChange={(e) => handleInputChange(row.id, 'abc_order_dct', e.target.value)}>
                                                    {!costObjectDepts.includes(row.abc_order_dct) && row.abc_order_dct !== '' && <option key={`custom-${row.abc_order_dct}`} value={row.abc_order_dct}>{row.abc_order_dct}</option>}
                                                    {costObjectDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <select className={styles.input} value={row.abc_oper_dct} onChange={(e) => handleInputChange(row.id, 'abc_oper_dct', e.target.value)}>
                                                    {!costObjectDepts.includes(row.abc_oper_dct) && row.abc_oper_dct !== '' && <option key={`custom-${row.abc_oper_dct}`} value={row.abc_oper_dct}>{row.abc_oper_dct}</option>}
                                                    {costObjectDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </td>
                                            <td><input className={styles.input} type="text" value={row.value.toLocaleString()} onChange={(e) => handleInputChange(row.id, 'value', e.target.value)} /></td>
                                            <td><input className={styles.input} value={row.note || ''} onChange={(e) => handleInputChange(row.id, 'note', e.target.value)} /></td>
                                            <td className={styles.centerText}><button className="ui-btn-danger" title="삭제" onClick={() => deleteRow(row.id)}><Trash2 size={16} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                                        <td colSpan="6" className={styles.centerText}>총 합계</td>
                                        <td className={styles.rightText} style={{ textAlign: 'right', paddingRight: '10px' }}>{rows.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0).toLocaleString()}</td>
                                        <td colSpan="2"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className={styles.summaryContainer}>
                    <div className={styles.summaryRowTop}>
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryTitle}>환자통계 (전체)</div>
                            <table className="ui-table">
                                <thead>
                                    <tr><th>통계 구분</th><th className={styles.rightText}>값</th><th className={styles.rightText}>비율</th></tr>
                                </thead>
                                <tbody>
                                    {summaries.driverFull.data.map(item => (
                                        <tr key={item.name}>
                                            <td>{item.name}</td>
                                            <td className={styles.rightText}>{item.value.toLocaleString()}</td>
                                            <td className={styles.rightText}>{item.ratio.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={styles.filterBar}>
                        <div className={styles.filterGroup}>
                            <Filter size={16} />
                            <span className={styles.filterLabel}>드라이버 필터:</span>
                            <select className={styles.summarySelect} value={selectedSummaryDriver} onChange={(e) => setSelectedSummaryDriver(e.target.value)}>
                                <option value="전체">전체</option>
                                {standardDrivers.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={styles.summaryRowBottom}>
                        {['abc_order_dept', 'abc_oper_dept', 'abc_order_dct', 'abc_oper_dct'].map(key => {
                            const titleMap = { abc_order_dept: '진료과', abc_oper_dept: '시행과', abc_order_dct: '처방의사', abc_oper_dct: '시행의사' };
                            return (
                                <div key={key} className={styles.summaryCard}>
                                    <div className={styles.summaryTitle}>{titleMap[key]} 통계</div>
                                    <table className="ui-table">
                                        <thead><tr><th>항목</th><th className={styles.rightText}>값</th><th className={styles.rightText}>%</th></tr></thead>
                                        <tbody>
                                            {summaries[key].data.map(item => (
                                                <tr key={item.name}>
                                                    <td>{item.name}</td>
                                                    <td className={styles.rightText}>{item.value.toLocaleString()}</td>
                                                    <td className={styles.rightText}>{item.ratio.toFixed(0)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                                                <td>합계</td>
                                                <td className={styles.rightText}>{summaries[key].total.toLocaleString()}</td>
                                                <td className={styles.rightText}>100%</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                                    const mappedForExport = rows.map(r => ({
                                        '회계기간': currentPeriod?.period_year || 2026,
                                        '기간유형': currentPeriod?.period_type || 'Year',
                                        '기간명': currentPeriod?.period_name || '2026_Year',
                                        '드라이버': r.driver_code,
                                        '진료과': r.abc_order_dept,
                                        '시행과': r.abc_oper_dept,
                                        '처방의사': r.abc_order_dct,
                                        '시행의사': r.abc_oper_dct,
                                        '값': r.value,
                                        '비고': r.note
                                    }));
                                    exportToExcel(mappedForExport, '환자통계데이터');
                                    setIsDownloadModalOpen(false);
                                }}
                                style={{ padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 600 }}
                            >
                                <FileDown size={18} color="#10b981" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>데이터 다운로드</div>
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

export default PatientStatsPage;
