import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import styles from './LoginPage.module.css'; // Reusing Login styles for consistency

const SignupPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        hospitalName: '',
        email: '',
        password: '',
        contactName: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.hospitalName || !formData.email || !formData.password) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        if (formData.password.length < 4) {
            alert('비밀번호는 4자 이상이어야 합니다.');
            return;
        }

        setLoading(true);
        try {
            await api.register(formData.email, formData.password, formData.hospitalName, formData.contactName, formData.phone);
            alert('회원가입이 완료되었습니다! 템플릿 데이터가 세팅되었습니다. 로그인해주세요.');
            navigate('/login');
        } catch (error) {
            alert(error.message || '회원가입 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.loginCard}>
                <div className={styles.header}>
                    <h2 className={styles.title}>회원가입</h2>
                    <p className={styles.subtitle}>ClinicProfit AI와 함께 병원 경영을 혁신하세요.</p>
                </div>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>병원명</label>
                        <input
                            type="text"
                            name="hospitalName"
                            value={formData.hospitalName}
                            onChange={handleChange}
                            placeholder="예: 서울메디컬"
                            className={styles.input}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>이메일 (아이디)</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="example@hospital.com"
                            className={styles.input}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>비밀번호</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="4자 이상 입력해주세요"
                            className={styles.input}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>담당자명 <span style={{fontSize:'12px', color:'#94a3b8'}}>(선택)</span></label>
                        <input
                            type="text"
                            name="contactName"
                            value={formData.contactName}
                            onChange={handleChange}
                            placeholder="예: 홍길동 팀장"
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>연락처 <span style={{fontSize:'12px', color:'#94a3b8'}}>(선택)</span></label>
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="예: 010-1234-5678"
                            className={styles.input}
                        />
                    </div>
                    <button type="submit" className={styles.loginBtn} disabled={loading}>
                        {loading ? '가입 처리 중 (데이터 세팅 중)...' : '가입하기'}
                    </button>
                </form>
                <div className={styles.footer}>
                    이미 계정이 있으신가요? <Link to="/login" className={styles.link}>로그인</Link>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
