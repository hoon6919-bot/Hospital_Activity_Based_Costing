import React, { useContext } from 'react';
import styles from './Footer.module.css';
import { PeriodContext } from '../../contexts/PeriodContext';

const Footer = () => {
    const { currentPeriod, isPeriodLoading, setIsPeriodModalOpen } = useContext(PeriodContext);
    const [user, setUser] = React.useState(null);

    React.useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setUser(JSON.parse(userStr));
            } catch(e) {}
        }
    }, []);

    const handleClick = () => {
        setIsPeriodModalOpen(true);
    };

    return (
        <footer
            className={styles.footer}
            style={{ backgroundColor: '#1e293b', color: '#94a3b8', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
            <div 
                className={styles.content} 
                style={{ justifyContent: 'flex-start', gap: '12px', cursor: 'pointer', paddingLeft: '20px' }}
                onClick={handleClick}
                title="클릭하여 원가계산 기간 변경"
            >
                <span style={{ fontSize: '16px' }}>📅</span>
                {isPeriodLoading ? (
                    <span style={{ color: '#64748b' }}>회계기간 로딩 중...</span>
                ) : (
                    <>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>현재 회계기간</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '14px' }}>
                            {currentPeriod
                                ? `${currentPeriod.period_name}(${currentPeriod.period_type})`
                                : '기간 미설정'}
                        </span>
                        <span style={{ color: '#475569', fontSize: '12px', marginLeft: '4px' }}>[클릭하여 변경]</span>
                    </>
                )}
            </div>

            {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingRight: '20px' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '13px' }}>
                        <strong style={{ color: '#f8fafc', fontWeight: 800 }}>{user.hospital_name}</strong> 님 접속중
                    </span>
                    <button 
                        onClick={() => {
                            if(window.confirm('로그아웃 하시겠습니까?')) {
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                localStorage.removeItem('is_authenticated');
                                window.location.href = '/login';
                            }
                        }}
                        style={{
                            background: 'transparent', border: '1px solid #475569', color: '#94a3b8',
                            padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.borderColor = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.background = 'transparent'; }}
                    >
                        로그아웃
                    </button>
                </div>
            )}
        </footer>
    );
};

export default Footer;
