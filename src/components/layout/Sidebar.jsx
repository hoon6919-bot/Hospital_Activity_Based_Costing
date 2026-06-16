import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, Users, Upload, BarChart3, Brain, Sparkles, DollarSign, Database } from 'lucide-react';
import clsx from 'clsx';
import styles from './Sidebar.module.css';

const Sidebar = () => {
    const navItems = [
        { name: '대시보드', path: '/', icon: LayoutDashboard },
        { name: '기초코드', path: '/setup', icon: Settings },
        { name: '인건비', path: '/employee', icon: Users },
        { name: '수익', path: '/revenue', icon: DollarSign },
        { name: '비용(회계전표)', path: '/cost', icon: Database },
        { name: '환자통계', path: '/patient-stats', icon: BarChart3 },
        { name: '원가배부값', path: '/allocation-value', icon: Settings },
        { name: '계산로직', path: '/logic', icon: Brain },
        { name: '실행', path: '/run', icon: Sparkles },
        { name: '결과', path: '/result', icon: BarChart3 },
    ];

    let role = '일반';
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            role = JSON.parse(userStr).role;
        }
    } catch (e) {}

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                <BarChart3 className={styles.logoIcon} />
                <span>병원 활동원가계산</span>
            </div>
            <nav className={styles.nav}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            clsx(styles.link, { [styles.active]: isActive })
                        }
                    >
                        <item.icon className={styles.icon} />
                        <span>{item.name}</span>
                    </NavLink>
                ))}
                {role === '관리자' && (
                    <NavLink
                        to="/admin"
                        className={({ isActive }) =>
                            clsx(styles.link, { [styles.active]: isActive })
                        }
                        style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}
                    >
                        <Users className={styles.icon} />
                        <span style={{ fontWeight: 'bold' }}>가입자 관리</span>
                    </NavLink>
                )}
            </nav>
            <div className={styles.footer}>
                <p>© 2026 ClinicProfit AI</p>
            </div>
        </aside>
    );
};

export default Sidebar;
