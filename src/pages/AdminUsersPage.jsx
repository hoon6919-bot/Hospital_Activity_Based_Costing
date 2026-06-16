import React, { useEffect, useState } from 'react';
import { api } from '../api';
import styles from './ResultPage.module.css'; // Reusing ResultPage styles for tables
import { Search, Plus, Save, FileDown, Upload, Trash2, KeyRound } from 'lucide-react';

const AdminUsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const data = await api.getUsers();
                setUsers(data || []);
            } catch (err) {
                alert(err.message || '가입자 목록을 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };
        loadUsers();
    }, []);

    const handleDelete = async (id, name) => {
        if (id === 1) {
            alert('최고 관리자 계정은 삭제할 수 없습니다.');
            return;
        }
        if (window.confirm(`'${name}' 가입자를 정말 삭제하시겠습니까?`)) {
            try {
                await api.deleteUser(id);
                setUsers(users.filter(u => u.id !== id));
                alert('가입자가 삭제되었습니다.');
            } catch (err) {
                alert(err.message || '가입자 삭제에 실패했습니다.');
            }
        }
    };

    const handleResetPassword = async (id, name) => {
        if (id === 1) {
            alert('최고 관리자 계정은 비밀번호를 초기화할 수 없습니다.');
            return;
        }
        if (window.confirm(`'${name}' 가입자의 비밀번호를 'abc-costing'으로 초기화하시겠습니까?`)) {
            try {
                await api.resetUserPassword(id);
                alert(`비밀번호가 'abc-costing'으로 성공적으로 초기화되었습니다.`);
            } catch (err) {
                alert(err.message || '비밀번호 초기화에 실패했습니다.');
            }
        }
    };

    const filteredUsers = users.filter(u => 
        (u.hospital_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div style={{ padding: '24px' }}>Loading...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>가입자 현황 관리</h1>
            </div>

            <div className={styles.content}>
                <div className={styles.toolbar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            <input
                                type="text"
                                placeholder="병원명, 아이디, 담당자 검색"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                        <div style={{ fontSize: '14px', color: '#475569', fontWeight: 600 }}>
                            총 가입자: {filteredUsers.length}명
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="ui-btn-secondary" onClick={() => alert('가입자 추가 기능은 준비 중입니다.')}>
                            <Plus size={16} /> 추가
                        </button>
                        <button className="ui-btn-primary" onClick={() => alert('저장 기능은 준비 중입니다.')}>
                            <Save size={16} /> 저장
                        </button>
                        <button className="ui-btn-secondary" onClick={() => alert('다운로드 기능은 준비 중입니다.')}>
                            <FileDown size={16} /> 다운로드
                        </button>
                        <button className="ui-btn-secondary" onClick={() => alert('업로드 기능은 준비 중입니다.')}>
                            <Upload size={16} /> 업로드
                        </button>
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: 50 }}>No</th>
                                <th>ID (이메일)</th>
                                <th>병원명</th>
                                <th style={{ width: 100 }}>담당자명</th>
                                <th style={{ width: 120 }}>연락처</th>
                                <th style={{ width: 100 }}>권한유형</th>
                                <th style={{ width: 80 }}>상태</th>
                                <th style={{ width: 100 }}>가입일</th>
                                <th style={{ width: 160 }}>최근 접속일</th>
                                <th style={{ width: 80 }}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td style={{ textAlign: 'center' }}>{user.id}</td>
                                    <td>{user.email}</td>
                                    <td>{user.hospital_name}</td>
                                    <td style={{ textAlign: 'center' }}>{user.contact_name || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{user.phone || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{user.role}</td>
                                    <td style={{ textAlign: 'center' }}>{user.status || '정상'}</td>
                                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{user.join_date}</td>
                                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{user.last_login ? new Date(user.last_login).toLocaleString() : '-'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {user.id !== 1 && (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button 
                                                    onClick={() => handleResetPassword(user.id, user.hospital_name)}
                                                    className="ui-btn-secondary" 
                                                    title="비밀번호 초기화"
                                                    style={{ padding: '4px', background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer' }}
                                                >
                                                    <KeyRound size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(user.id, user.hospital_name)}
                                                    className="ui-btn-danger" 
                                                    title="삭제"
                                                    style={{ padding: '4px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                        검색된 사용자가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUsersPage;
