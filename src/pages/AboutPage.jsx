import React from 'react';
import { Calculator, Zap, Brain, BarChart2 } from 'lucide-react';
import styles from './AboutPage.module.css';

const AboutPage = () => {
    const features = [
        {
            icon: Calculator,
            title: "정밀한 ABC 원가 계산",
            desc: "활동 기준 원가 계산(ABC) 로직을 통해 숨겨진 비용까지 정확하게 찾아냅니다."
        },
        {
            icon: Zap,
            title: "실시간 데이터 처리",
            desc: "복잡한 연산도 브라우저에서 즉시 처리하여 결과를 바로 확인할 수 있습니다."
        },
        {
            icon: Brain,
            title: "AI 경영 인사이트",
            desc: "단순 통계를 넘어, AI가 수익성 개선을 위한 구체적인 실행 방안을 제안합니다."
        },
        {
            icon: BarChart2,
            title: "4-View 입체 분석",
            desc: "진료과, 시행과, 처방의사, 시행의사 4가지 관점에서 입체적으로 분석합니다."
        }
    ];

    return (
        <div className={styles.page}>
            <div className={styles.hero}>
                <h2 className={styles.title}>병원 경영의 새로운 기준, ClinicProfit AI</h2>
                <p className={styles.subtitle}>
                    데이터 기반의 의사결정으로 병원의 수익성을 극대화하세요.
                    복잡한 회계 지식 없이도 누구나 전문가 수준의 분석이 가능합니다.
                </p>
            </div>

            <div className={styles.features}>
                {features.map((f, i) => (
                    <div key={i} className={styles.featureCard}>
                        <div className={styles.iconWrapper}>
                            <f.icon size={24} />
                        </div>
                        <h3 className={styles.featureTitle}>{f.title}</h3>
                        <p className={styles.featureText}>{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AboutPage;
