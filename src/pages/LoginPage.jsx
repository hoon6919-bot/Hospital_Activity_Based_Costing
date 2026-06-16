import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import styles from './LoginPage.module.css';

const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = await api.login(email, password);
            alert(`환영합니다, ${data.user.hospital_name} 님!`);
            navigate('/');
        } catch (error) {
            alert(error.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.loginCard}>
                <div className={styles.header}>
                    <h2 className={styles.title}>로그인</h2>
                    <p className={styles.subtitle}>ClinicProfit AI에 오신 것을 환영합니다.</p>
                </div>
                <form className={styles.form} onSubmit={handleLogin}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>이메일 계정</label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="SDhospital@gmail.com"
                            className={styles.input}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className={styles.input}
                            required
                        />
                    </div>
                    <button type="submit" className={styles.loginBtn} disabled={loading}>
                        {loading ? '로그인 중...' : '로그인'}
                    </button>
                </form>
                <div className={styles.footer}>
                    <div style={{ marginBottom: '10px' }}>
                        계정을 잊으셨나요? <Link to="/find-account" className={styles.link}>아이디/비밀번호 찾기</Link>
                    </div>
                    <div>
                        계정이 없으신가요? <Link to="/signup" className={styles.link}>회원가입</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
