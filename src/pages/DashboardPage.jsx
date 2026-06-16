import React, { useContext, useState, Component } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import styles from './DashboardPage.module.css';
import { PeriodContext } from '../contexts/PeriodContext';
import { api } from '../api';

// ── 에러 바운더리 ──
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: '#dc2626', background: '#fef2f2', borderRadius: '8px', margin: '12px' }}>
                    <strong>컴포넌트 오류:</strong> {this.state.error?.message || '알 수 없는 오류'}
                </div>
            );
        }
        return this.props.children;
    }
}

// ── 삭제 확인 경고 팝업 ──
const DeleteWarningModal = ({ period, onConfirm, onCancel }) => (
    <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
        <div style={{ background: 'white', borderRadius: '16px', width: '380px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '28px' }}>⚠️</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#dc2626' }}>기간 삭제 경고</h3>
            </div>
            <p style={{ margin: '0 0 8px', color: '#0f172a', fontWeight: 700 }}>
                '{String(period.period_name)}' 기간을 삭제하시겠습니까?
            </p>
            <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
                padding: '12px', marginBottom: '24px', fontSize: '13px', color: '#dc2626', lineHeight: '1.6'
            }}>
                🚨 이 기간에 등록된 <strong>인건비 데이터 등 모든 관련 데이터</strong>가 함께 삭제됩니다.<br/>
                삭제된 데이터는 <strong>복구할 수 없습니다.</strong>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={onCancel} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, color: '#475569' }}>취소</button>
                <button onClick={onConfirm} style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>삭제 확인</button>
            </div>
        </div>
    </div>
);

// ── 원가계산 기간 관리 카드 내부 ──
const PeriodManageCardInner = () => {
    const context = useContext(PeriodContext);

    // 안전한 기본값 처리
    const periods      = Array.isArray(context?.periods) ? context.periods : [];
    const currentPeriod = context?.currentPeriod || null;
    const loadPeriods  = typeof context?.loadPeriods === 'function' ? context.loadPeriods : () => Promise.resolve();

    const [editingId, setEditingId]       = useState(null);
    const [editForm, setEditForm]         = useState({});
    const [isAdding, setIsAdding]         = useState(false);
    const [newForm, setNewForm]           = useState({ period_year: new Date().getFullYear(), period_type: '월', period_name: '' });
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [selectedYear, setSelectedYear] = useState(null);

    const PERIOD_TYPES = ['월', '분기', '반기', '연간'];

    const availableYears = [...new Set(periods.map(p => Number(p.period_year)))].sort((a, b) => b - a);

    const filteredPeriods = selectedYear != null
        ? periods.filter(p => Number(p.period_year) === Number(selectedYear))
        : periods;

    const inputStyle = { padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' };

    const handleAdd = async () => {
        if (!newForm.period_name.trim()) { alert('기간명을 입력해주세요.'); return; }
        try {
            await api.addPeriod({ ...newForm, period_year: Number(newForm.period_year) });
            await loadPeriods();
            setIsAdding(false);
            setNewForm({ period_year: new Date().getFullYear(), period_type: '월', period_name: '' });
        } catch (err) { alert(err.message); }
    };

    const handleEditSave = async () => {
        if (!editForm.period_name?.trim()) { alert('기간명을 입력해주세요.'); return; }
        try {
            await api.updatePeriod(editingId, { ...editForm, period_year: Number(editForm.period_year) });
            await loadPeriods();
            setEditingId(null);
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async () => {
        try {
            await api.deletePeriod(deleteTarget.id);
            await loadPeriods();
            setDeleteTarget(null);
        } catch (err) { alert(err.message); }
    };

    const startEdit = (p) => {
        setEditingId(p.id);
        setEditForm({ period_year: p.period_year, period_type: p.period_type, period_name: p.period_name });
    };

    const isActive = (p) =>
        currentPeriod &&
        Number(currentPeriod.period_year) === Number(p.period_year) &&
        String(currentPeriod.period_name) === String(p.period_name);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>

            {/* ① 헤더: 설명 + 추가 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px', lineHeight: '1.5' }}>
                    원가계산을 수행할 회계기간을 등록하세요.<br/>
                    하단 푸터 클릭으로 작업 기간을 선택합니다.
                </p>
                <button
                    onClick={() => { setIsAdding(true); setEditingId(null); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', background: '#3b82f6', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                        whiteSpace: 'nowrap', flexShrink: 0
                    }}
                >
                    <Plus size={14} /> 추가
                </button>
            </div>

            {/* ② 연도 필터 탭 */}
            {availableYears.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button onClick={() => setSelectedYear(null)} style={{
                        padding: '4px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 700, transition: 'all 0.15s',
                        background: selectedYear === null ? '#0f172a' : '#f1f5f9',
                        color: selectedYear === null ? 'white' : '#64748b',
                    }}>전체</button>
                    {availableYears.map(y => (
                        <button key={y} onClick={() => setSelectedYear(y)} style={{
                            padding: '4px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                            fontSize: '12px', fontWeight: 700, transition: 'all 0.15s',
                            background: selectedYear === y ? '#0f172a' : '#f1f5f9',
                            color: selectedYear === y ? 'white' : '#64748b',
                        }}>{y}년</button>
                    ))}
                </div>
            )}

            {/* ③ 신규 추가 행 */}
            {isAdding && (
                <div style={{
                    display: 'flex', gap: '8px', alignItems: 'center',
                    padding: '12px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe'
                }}>
                    <input type="number" value={newForm.period_year} placeholder="연도"
                        onChange={e => setNewForm({ ...newForm, period_year: e.target.value })}
                        style={{ ...inputStyle, width: '70px' }} />
                    <select value={newForm.period_type}
                        onChange={e => setNewForm({ ...newForm, period_type: e.target.value })}
                        style={{ ...inputStyle }}>
                        {PERIOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="text" value={newForm.period_name} placeholder="예: 3월, 1분기, 상반기"
                        onChange={e => setNewForm({ ...newForm, period_name: e.target.value })}
                        style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={handleAdd} style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Check size={14} /></button>
                    <button onClick={() => setIsAdding(false)} style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><X size={14} /></button>
                </div>
            )}

            {/* ④ 기간 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredPeriods.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0', fontSize: '14px' }}>
                        {periods.length === 0 ? (
                            <>
                                <div>등록된 회계기간이 없습니다.</div>
                                <div style={{ fontSize: '12px', marginTop: '4px' }}>위의 [추가] 버튼을 눌러 기간을 등록하세요.</div>
                            </>
                        ) : (
                            <div style={{ fontSize: '13px' }}>{selectedYear}년에 등록된 기간이 없습니다.</div>
                        )}
                    </div>
                ) : (
                    filteredPeriods.map(p => {
                        const active   = isActive(p);
                        const editing  = editingId === p.id;

                        return (
                            <div key={p.id} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 14px',
                                border: active ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                borderRadius: '10px',
                                background: active ? '#eff6ff' : '#f8fafc',
                            }}>
                                {editing ? (
                                    <>
                                        <input type="number" value={editForm.period_year}
                                            onChange={e => setEditForm({ ...editForm, period_year: e.target.value })}
                                            style={{ ...inputStyle, width: '70px' }} />
                                        <select value={editForm.period_type}
                                            onChange={e => setEditForm({ ...editForm, period_type: e.target.value })}
                                            style={{ ...inputStyle }}>
                                            {PERIOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <input type="text" value={editForm.period_name}
                                            onChange={e => setEditForm({ ...editForm, period_name: e.target.value })}
                                            style={{ ...inputStyle, flex: 1 }} />
                                        <button onClick={handleEditSave} style={{ padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Check size={13} /></button>
                                        <button onClick={() => setEditingId(null)} style={{ padding: '5px 10px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><X size={13} /></button>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {String(p.period_name)}({String(p.period_type)})
                                                {active && (
                                                    <span style={{ color: '#3b82f6', fontSize: '11px', fontWeight: 700, background: '#dbeafe', padding: '1px 6px', borderRadius: '8px' }}>✓ 현재</span>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={() => startEdit(p)} style={{ padding: '5px 10px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}><Pencil size={13} /></button>
                                        <button onClick={() => setDeleteTarget(p)} style={{ padding: '5px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={13} /></button>
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* ⑤ 삭제 경고 모달 */}
            {deleteTarget && (
                <DeleteWarningModal
                    period={deleteTarget}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
};

// ErrorBoundary로 감싼 최종 카드
const PeriodManageCard = () => (
    <ErrorBoundary>
        <PeriodManageCardInner />
    </ErrorBoundary>
);

// ── 대시보드 메인 ──
const DashboardPage = () => {
    return (
        <div className={styles.page}>
            <div className={styles.headerSection}>
                <h2 className={styles.mainTitle}>병원 활동원가계산(Activity Based Costing)</h2>
                <p className={styles.subTitle}>간단한 기초자료를 활용하여 ABC원가계산을 체험해 보세요</p>
            </div>

            <div className={styles.contentRow}>
                {/* Left: 원가계산 절차 */}
                <div className={styles.sectionCard}>
                    <div className={styles.cardHeader}>원가계산 절차 Guide</div>
                    <div className={styles.cardBody}>
                        <div className={styles.procedureContainer}>
                            <div className={styles.procedureRow}>
                                <Link to="/setup" className={styles.procButton}>
                                    <span className={styles.stepNumber}>Step 01</span>기초코드
                                </Link>
                                <Link to="/employee" className={styles.procButton}>
                                    <span className={styles.stepNumber}>Step 02</span>인건비
                                </Link>
                            </div>
                            <div className={styles.procedureRow}>
                                <Link to="/revenue" className={styles.procButton}>
                                    <span className={styles.stepNumber}>Step 03</span>수익
                                </Link>
                                <Link to="/cost" className={styles.procButton}>
                                    <span className={styles.stepNumber}>Step 04</span>비용
                                </Link>
                                <Link to="/patient-stats" className={styles.procButton}>
                                    <span className={styles.stepNumber}>Step 05</span>환자통계
                                </Link>
                            </div>
                            <div className={styles.procedureRow}>
                                <Link to="/allocation-value" className={styles.procButton}>
                                    <span className={styles.stepNumber}>Step 06</span>원가배부값
                                </Link>
                                <Link to="/logic" className={styles.procButton}>
                                    <span className={styles.stepNumber}>Step 07</span>계산 로직
                                </Link>
                            </div>
                            <div className={styles.procedureRow}>
                                <Link to="/result" className={styles.procButton} style={{ backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }}>
                                    <span className={styles.stepNumber} style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>Final</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        원가계산 결과 보기 <ArrowRight size={16} />
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: 원가계산 기간 관리 */}
                <div className={styles.sectionCard}>
                    <div className={styles.cardHeader}>원가계산 기간</div>
                    <div className={styles.cardBody} style={{ padding: '20px' }}>
                        <PeriodManageCard />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
