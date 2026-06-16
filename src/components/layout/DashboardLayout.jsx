import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import Sidebar from './Sidebar';
import Footer from './Footer';
import styles from './DashboardLayout.module.css';
import { PeriodContext } from '../../contexts/PeriodContext';

const PeriodSelectModal = () => {
    const { periods, currentPeriod, changePeriod, isPeriodModalOpen, setIsPeriodModalOpen } = useContext(PeriodContext);

    if (!isPeriodModalOpen) return null;

    const handleSelect = async (period) => {
        await changePeriod({
            period_year: period.period_year,
            period_type: period.period_type,
            period_name: period.period_name,
        });
        setIsPeriodModalOpen(false);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: 'white', borderRadius: '16px', width: '420px',
                maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
                <div style={{ padding: '24px 24px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>회계기간 선택</h3>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
                        작업할 회계기간을 선택하세요. 선택한 기간의 데이터가 조회됩니다.
                    </p>
                </div>

                <div style={{ overflowY: 'auto', padding: '16px 24px', flex: 1 }}>
                    {periods.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0', fontSize: '14px' }}>
                            등록된 회계기간이 없습니다.<br/>
                            <span style={{ fontSize: '12px' }}>대시보드 &gt; 원가계산 기간에서 먼저 등록해 주세요.</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {periods.map(p => {
                                const isActive = currentPeriod?.period_year === p.period_year
                                    && currentPeriod?.period_name === p.period_name;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => handleSelect(p)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '14px 16px', border: isActive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                            borderRadius: '10px', background: isActive ? '#eff6ff' : '#f8fafc',
                                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                                        }}
                                    >
                                        <span style={{ fontSize: '22px' }}>📅</span>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>
                                                {p.period_name}({p.period_type})
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                {isActive && <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓ 현재 선택됨</span>}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => setIsPeriodModalOpen(false)}
                        style={{
                            padding: '10px 20px', background: '#f1f5f9', border: 'none',
                            borderRadius: '8px', cursor: 'pointer', fontWeight: 700, color: '#475569'
                        }}
                    >닫기</button>
                </div>
            </div>
        </div>
    );
};

const DashboardLayout = () => {
    const location = useLocation();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const auth = localStorage.getItem('is_authenticated');
        setIsLoggedIn(auth === 'true');
    }, [location]);

    return (
        <div className={styles.layout}>
            <Sidebar />
            <main className={styles.main}>
                <header className={styles.header}>
                    <h1>병원 활동원가계산</h1>
                    <nav className={styles.topNav}>
                        <Link to="/" className={styles.navLink}>홈</Link>
                        <Link to="/about" className={styles.navLink}>소개</Link>
                        {(() => {
                            const userStr = localStorage.getItem('user');
                            let role = '일반';
                            try {
                                if (userStr) {
                                    const userObj = JSON.parse(userStr);
                                    role = userObj.role;
                                }
                            } catch (e) {}
                            
                            return role === '관리자' ? (
                                <Link to="/admin" className={styles.navLink} style={{ fontWeight: 'bold' }}>가입자 현황</Link>
                            ) : null;
                        })()}
                        {isLoggedIn ? (
                            <Link to="/mypage" className={styles.navLink} style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>My Page</Link>
                        ) : (
                            <Link to="/login" className={styles.navLink}>로그인</Link>
                        )}
                    </nav>
                </header>
                <div className={styles.content}>
                    <Outlet />
                </div>
                <Footer />
            </main>
            <PeriodSelectModal />
        </div>
    );
};

export default DashboardLayout;
