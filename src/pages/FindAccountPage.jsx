import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import styles from './LoginPage.module.css'; // Reusing Login styles for consistency

const FindAccountPage = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('id'); // 'id' | 'pw'
    const [loading, setLoading] = useState(false);
    
    // ID 찾기용 상태
    const [hospitalNameId, setHospitalNameId] = useState('');
    const [foundId, setFoundId] = useState('');

    // PW 재설정용 상태
    const [hospitalNamePw, setHospitalNamePw] = useState('');
    const [emailPw, setEmailPw] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [pwResetSuccess, setPwResetSuccess] = useState(false);

    const handleFindId = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFoundId('');
        try {
            const data = await api.findId(hospitalNameId);
            setFoundId(data.maskedEmail);
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPw = async (e) => {
        e.preventDefault();
        if (newPassword.length < 4) {
            alert('새 비밀번호는 4자 이상이어야 합니다.');
            return;
        }
        setLoading(true);
        try {
            await api.resetPassword(emailPw, hospitalNamePw, newPassword);
            setPwResetSuccess(true);
            alert('비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.');
            navigate('/login');
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.loginCard} style={{ maxWidth: '450px' }}>
                <div className={styles.header}>
                    <h2 className={styles.title}>계정 찾기</h2>
                    <p className={styles.subtitle}>아이디 또는 비밀번호를 잊으셨나요?</p>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
                    <button 
                        onClick={() => { setTab('id'); setFoundId(''); }} 
                        style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', borderBottom: tab === 'id' ? '2px solid #3b82f6' : '2px solid transparent', color: tab === 'id' ? '#3b82f6' : '#64748b', fontWeight: tab === 'id' ? 'bold' : 'normal', cursor: 'pointer' }}
                    >
                        아이디 찾기
                    </button>
                    <button 
                        onClick={() => { setTab('pw'); setPwResetSuccess(false); }} 
                        style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', borderBottom: tab === 'pw' ? '2px solid #3b82f6' : '2px solid transparent', color: tab === 'pw' ? '#3b82f6' : '#64748b', fontWeight: tab === 'pw' ? 'bold' : 'normal', cursor: 'pointer' }}
                    >
                        비밀번호 재설정
                    </button>
                </div>

                {tab === 'id' && (
                    <form className={styles.form} onSubmit={handleFindId}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>가입한 병원명</label>
                            <input
                                type="text"
                                value={hospitalNameId}
                                onChange={(e) => setHospitalNameId(e.target.value)}
                                placeholder="예: 서울메디컬"
                                className={styles.input}
                                required
                            />
                        </div>
                        <button type="submit" className={styles.loginBtn} disabled={loading}>
                            {loading ? '검색 중...' : '아이디 찾기'}
                        </button>
                        {foundId && (
                            <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>검색된 아이디</div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>{foundId}</div>
                            </div>
                        )}
                    </form>
                )}

                {tab === 'pw' && (
                    <form className={styles.form} onSubmit={handleResetPw}>
                        {!pwResetSuccess && (
                            <>
                                <div style={{ marginBottom: '16px', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                                    본인 확인을 위해 가입하신 <b>아이디</b>와 <b>병원명</b>을 입력해 주세요. 일치할 경우 즉시 새 비밀번호로 변경할 수 있습니다.
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>이메일 (아이디)</label>
                                    <input
                                        type="text"
                                        value={emailPw}
                                        onChange={(e) => setEmailPw(e.target.value)}
                                        placeholder="example@hospital.com"
                                        className={styles.input}
                                        required
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>가입한 병원명</label>
                                    <input
                                        type="text"
                                        value={hospitalNamePw}
                                        onChange={(e) => setHospitalNamePw(e.target.value)}
                                        placeholder="예: 서울메디컬"
                                        className={styles.input}
                                        required
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>새 비밀번호</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="4자 이상 입력"
                                        className={styles.input}
                                        required
                                    />
                                </div>
                                <button type="submit" className={styles.loginBtn} disabled={loading}>
                                    {loading ? '처리 중...' : '비밀번호 재설정'}
                                </button>
                            </>
                        )}
                    </form>
                )}

                <div className={styles.footer} style={{ marginTop: '24px' }}>
                    <Link to="/login" className={styles.link}>로그인 화면으로 돌아가기</Link>
                </div>
            </div>
        </div>
    );
};

export default FindAccountPage;
