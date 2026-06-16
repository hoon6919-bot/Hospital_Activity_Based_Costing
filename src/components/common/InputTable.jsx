import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import styles from './InputTable.module.css';

const InputTable = ({ columns, data, onAdd, onDelete, onChange }) => {
    // columns: [{ key, label, type, placeholder }]

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key}>{col.label}</th>
                        ))}
                        <th className={styles.actionCol}></th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr key={index}>
                            {columns.map((col) => (
                                <td key={col.key}>
                                    {col.type === 'select' ? (
                                        <select
                                            value={row[col.key] || ''}
                                            onChange={(e) => onChange(index, col.key, e.target.value)}
                                            className={styles.input}
                                        >
                                            <option value="" disabled>{col.placeholder || "선택"}</option>
                                            {col.options && col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type={col.type || 'text'}
                                            value={row[col.key] || ''}
                                            placeholder={col.placeholder}
                                            onChange={(e) => onChange(index, col.key, e.target.value)}
                                            className={styles.input}
                                        />
                                    )}
                                </td>
                            ))}
                            <td className={styles.actionCol}>
                                <button
                                    onClick={() => onDelete(index)}
                                    className={styles.deleteBtn}
                                    aria-label="Delete row"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={onAdd} className={styles.addBtn}>
                <Plus size={16} />
                <span>항목 추가</span>
            </button>
        </div>
    );
};

export default InputTable;
