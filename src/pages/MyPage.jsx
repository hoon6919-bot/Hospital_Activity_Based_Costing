import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import styles from './MyPage.module.css';

const MyPage = () => {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState({
        hospital_name: '',
        email: '',
        role: '',
        join_date: ''
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // api.getMe() fetches from DB, ensuring real-time data
                const user = await api.getMe();
                setUserInfo(user);
            } catch (err) {
                // fallback to local storage
                const stored = localStorage.getItem('user');
                if (stored) {
                    setUserInfo(JSON.parse(stored));
                }
            }
        };
        fetchUser();
    }, []);

    const handleLogout = () => {
        if (window.confirm('로그아웃 하시겠습니까?')) {
            api.logout();
            alert('로그아웃 되었습니다.');
            navigate('/login');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h2 className={styles.title}>My Page</h2>
                    <p className={styles.subtitle}>계정 정보 및 설정을 관리합니다.</p>
                </div>

                <div className={styles.body}>
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>기본 정보</h3>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>병원명</span>
                                <div className={styles.value}>{userInfo.hospital_name || '로딩 중...'}</div>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>이메일 계정</span>
                                <div className={styles.value}>{userInfo.email || '로딩 중...'}</div>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>권한 그룹</span>
                                <div className={styles.value}>{userInfo.role || '로딩 중...'}</div>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>가입일</span>
                                <div className={styles.value}>{userInfo.join_date || '로딩 중...'}</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.actionRow}>
                        <button className={styles.logoutBtn} onClick={handleLogout}>
                            로그아웃
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyPage;
