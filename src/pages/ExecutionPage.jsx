import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { PeriodContext } from '../contexts/PeriodContext';
import { 
    Play, 
    RotateCcw, 
    Database, 
    Calculator, 
    Share2, 
    BarChart3, 
    CheckCircle2, 
    AlertCircle,
    ChevronRight,
    SearchCheck,
    GitMerge,
    Coins
} from 'lucide-react';
import styles from './ExecutionPage.module.css';
import { runFullCalculation } from '../utils/calculationEngine';
import { api } from '../api';

const STEPS_CONFIG = [
    { id: 1, title: '계정 배부', icon: GitMerge, desc: '공통 계정원가를 수익/인원수 기여도에 따라 선배부합니다.' },
    { id: 2, title: '활동 전환', icon: Share2, desc: '인건비를 부서 활동 비율에 따라 활동원가로 분해합니다.' },
    { id: 3, title: '타부서 배부', icon: GitMerge, desc: '지원 부서의 활동을 수혜 부서의 활동으로 배부합니다.' },
    { id: 4, title: '원가대상 귀속', icon: Coins, desc: '최종 시행과/의사 단위로 손익을 확정합니다.' },
    { id: 5, title: '보고서 생성', icon: BarChart3, desc: '손익 분석 및 원가 배부 검증 보고서를 생성합니다.' }
];

const ExecutionPage = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('idle'); // idle, running, completed
    const [currentStep, setCurrentStep] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const { currentPeriod } = useContext(PeriodContext);
    const [selectedYear, setSelectedYear] = useState('2024');
    const [selectedMonth, setSelectedMonth] = useState('03');
    const [calcResults, setCalcResults] = useState(null);

    useEffect(() => {
        if (currentPeriod) {
            setSelectedYear(currentPeriod.period_year);
            setSelectedMonth(currentPeriod.period_name);
        }
    }, [currentPeriod]);

    useEffect(() => {
        const checkStatus = async () => {
            if (selectedYear && selectedMonth) {
                try {
                    const savedPeriod = await api.getStore('clinic_calculated_period');
                    if (savedPeriod && String(savedPeriod.year) === String(selectedYear) && savedPeriod.month === selectedMonth) {
                        setStatus('completed');
                        setCurrentStep(5);
                    } else {
                        setStatus('idle');
                        setCurrentStep(0);
                    }
                } catch (e) {
                    console.error("Failed to check status", e);
                }
            }
        };
        checkStatus();
    }, [selectedYear, selectedMonth]);

    const runCalculation = async () => {
        setStatus('running');
        setCurrentStep(1);
        setProgressMessage('원가 계산 엔진을 초기화하고 있습니다...');

        // 실제 계산 엔진 실행 (비동기 시뮬레이션 포함)
        try {
            const results = await runFullCalculation(selectedYear, selectedMonth, async (title, message) => {
                // 이 콜백은 calculationEngine에서 각 단계 완료 시 호출됨
                setProgressMessage(message);
                
                // 엔진의 단계 타이틀에 따라 UI의 큰 단계를 업데이트
                if (title.includes("관점 1") || title.includes("계정 배부")) setCurrentStep(1);
                else if (title.includes("관점 2") || title.includes("활동 전환")) setCurrentStep(2);
                else if (title.includes("관점 3") || title.includes("타부서 배부")) setCurrentStep(3);
                else if (title.includes("관점 4") || title.includes("원가대상 귀속")) setCurrentStep(4);
                else if (title.includes("보고서 생성")) setCurrentStep(5);

                // 각 단계가 사용자에게 보이도록 강제 지연 (UX)
                await new Promise(resolve => setTimeout(resolve, 800));
            });

            // 보고서 생성 단계 표시를 위한 추가 지연 (UX)
            setCurrentStep(5);
            setProgressMessage('최종 검증 보고서를 생성하고 있습니다...');
            await new Promise(resolve => setTimeout(resolve, 800));

            // 데이터가 없는 경우에 대한 추가 안내
            if (results.totalCost === 0 && results.totalRevenue === 0) {
                setProgressMessage('입력된 수익 또는 비용 데이터가 없어 계산 결과가 0원입니다.');
            } else if (results.totalCost === 0) {
                setProgressMessage('수익은 집계되었으나, 계정 로직에 매핑된 비용이 없어 원가가 0원입니다.');
            }

            setCalcResults(results);
            await api.saveStore('clinic_calculated_period', { year: selectedYear, month: selectedMonth });
            setStatus('completed');
            setCurrentStep(5);
        } catch (error) {
            console.error(error);
            setStatus('error');
            setProgressMessage(error.message || '알 수 없는 오류가 발생했습니다.');
            await api.saveCostingResult(selectedYear, selectedMonth, []); // 불완전한 결과 삭제
        }
    };

    const resetCalculation = () => {
        setStatus('idle');
        setCurrentStep(0);
        setProgressMessage('');
        setCalcResults(null);
    };

    const displayMonth = selectedMonth.includes('월') ? selectedMonth.split('년').pop() : `${selectedMonth}월`;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h2 className={styles.title}>원가 계산 실행</h2>
                </div>
            </header>
            
            <div className="ui-subtitle-box">
                4관점(Perspectives) 활동기준 배부 로직을 기반으로 원가를 산출합니다.
            </div>

            {/* Config Section */}
            <div className={styles.configCard}>
                <div className={styles.configItem}>
                    <span className={styles.configLabel}>대상 회계 연도</span>
                    <select 
                        className={styles.selectField} 
                        value={selectedYear}
                        disabled={true}
                        style={{ backgroundColor: '#f8fafc', color: '#475569', opacity: 1 }}
                    >
                        <option value={selectedYear}>{selectedYear}년</option>
                    </select>
                </div>
                <div className={styles.configItem}>
                    <span className={styles.configLabel}>대상 회계 월</span>
                    <select 
                        className={styles.selectField}
                        value={selectedMonth}
                        disabled={true}
                        style={{ backgroundColor: '#f8fafc', color: '#475569', opacity: 1 }}
                    >
                        <option value={selectedMonth}>{displayMonth}</option>
                    </select>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                    <div className={styles.descriptionBox} style={{ border: 'none', background: 'transparent', padding: 0 }}>
                        <InfoSection status={status} />
                    </div>
                </div>
            </div>

            {/* Steps Visualization */}
            <div className={styles.stepsGrid}>
                {STEPS_CONFIG.map((step) => {
                    const isActive = status === 'running' && currentStep === step.id;
                    const isCompleted = status === 'completed' || (status === 'running' && currentStep > step.id);
                    
                    return (
                        <div 
                            key={step.id} 
                            className={`${styles.stepCard} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
                        >
                            <div className={styles.stepNumber}>{step.id}</div>
                            <div className={styles.iconBox}>
                                <step.icon size={28} />
                            </div>
                            <div className={styles.stepTitle}>{step.title}</div>
                            <p className={styles.stepDesc}>{step.desc}</p>
                            {isActive && <div className={styles.pulse} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'var(--color-primary)' }}></div>}
                        </div>
                    );
                })}
            </div>

            {/* Center Execution Card */}
            <div className={styles.executionCenter}>
                <div className={styles.statusSummary}>
                    <h3 className={styles.statusHeadline} style={status === 'error' ? { color: 'var(--color-error)' } : {}}>
                        {status === 'idle' && '계산 엔진 가동 준비'}
                        {status === 'running' && progressMessage}
                        {status === 'completed' && '원가계산 완료'}
                        {status === 'error' && '원가계산이 정상적으로 종료되지 않았습니다'}
                    </h3>
                    <p className={styles.statusSubline}>
                        {status === 'idle' && `${selectedYear}년 ${displayMonth} 회계 데이터를 처리하기 위한 모든 준비가 완료되었습니다.`}
                        {status === 'running' && '안정적인 원가 산출을 위해 브라우저를 끄지 말고 잠시만 대기해 주세요.'}
                        {status === 'completed' && (calcResults 
                            ? `총 원가 산출이 완료되었습니다. (총 원가: ${calcResults.totalCost.toLocaleString()}원)` 
                            : `${selectedYear}년 ${displayMonth} 원가 산출이 이미 완료된 상태입니다.`)}
                        {status === 'error' && progressMessage}
                    </p>
                </div>

                {status === 'idle' && (
                    <button className={styles.runButton} onClick={runCalculation}>
                        <Play size={24} fill="currentColor" />
                        원가 계산 시작
                    </button>
                )}

                {status === 'running' && (
                    <div className={styles.loaderRing}></div>
                )}

                {status === 'completed' && (
                    <div className={styles.resultActions}>
                        <button className={styles.runButton} style={{ background: '#F1F5F9', color: '#475569', boxShadow: 'none' }} onClick={resetCalculation}>
                            <RotateCcw size={18} />
                            초기화
                        </button>
                        <button className={styles.viewResultButton} onClick={() => navigate('/result')}>
                            <CheckCircle2 size={18} />
                            결과 리포트 보기
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className={styles.resultActions}>
                        <button className={styles.runButton} style={{ background: '#F1F5F9', color: '#475569', boxShadow: 'none' }} onClick={resetCalculation}>
                            <RotateCcw size={18} />
                            초기화 후 다시 시도
                        </button>
                        <button className={styles.viewResultButton} style={{ background: 'var(--color-primary)' }} onClick={() => navigate('/allocation-value')}>
                            <AlertCircle size={18} />
                            드라이버 설정 수정하기
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const InfoSection = ({ status }) => {
    if (status === 'completed') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontWeight: 700 }}>
                <CheckCircle2 size={16} /> 검증 및 배부 완료
            </div>
        );
    }
    if (status === 'running') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 700 }}>
                <div className={styles.pulse}>●</div> 계산 로직 실행 중
            </div>
        );
    }
    if (status === 'error') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)', fontWeight: 700 }}>
                <AlertCircle size={16} /> 오류 상태
            </div>
        );
    }
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            <AlertCircle size={16} /> 미실행 상태
        </div>
    );
};

export default ExecutionPage;
