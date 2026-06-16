const xlsx = require('xlsx');
const fs = require('fs');

const outputPath = 'c:\\Users\\SAMSUNG\\Desktop\\SD.신동\\00-system\\병원원가계산_작업문서.xlsx';

// Create a new workbook
const wb = xlsx.utils.book_new();

// Sheet 1: 프로젝트 개요 (Overview) - adapted from original template
const wsOverviewData = [
  ['분류', '내용'],
  ['프로젝트 명', 'ClinicProfit AI (의료기관 원가계산 시스템)'],
  ['한 줄 정의', '병원의 복잡한 원가를 활동기준원가계산(ABC) 방식으로 배부하고 분석하여 숨은 원가를 찾는 로컬 풀스택 웹 앱'],
  ['현재 단계', '개발 완료 (기능 단위 구현 및 테스트 가능)'],
  ['주 사용자', '병원 관리자, 재무/회계 담당자, 원무과'],
  ['개발 환경(Front)', 'React, Vite, CSS Modules, Lucide React, Recharts'],
  ['개발 환경(Back)', 'Node.js, Express, SQLite'],
  ['완료 판단 기준', '데이터 입력부터 4단계 원가 배부 로직 실행 후 시각화 결과 확인 가능 여부']
];
const wsOverview = xlsx.utils.aoa_to_sheet(wsOverviewData);
wsOverview['!cols'] = [{ wch: 20 }, { wch: 80 }];
xlsx.utils.book_append_sheet(wb, wsOverview, "프로젝트 개요");

// Sheet 2: 기능 명세 및 화면 단위 작업 내용 (Detailed work breakdown)
const wsFeaturesData = [
  ['No', '메뉴(화면)', '상태', '경로(URL)', '역할 및 주요 기능', '구현 파일명'],
  [1, '홈 (Dashboard)', '완료', '/', '시스템 접근 시 첫 화면, 원가계산 절차 가이드 및 네비게이션 제공', 'DashboardPage.jsx'],
  [2, '기초코드 (Setup)', '완료', '/setup', '원가계산 뼈대 마스터 데이터(부서, 직종, 계정코드, 표준 활동 등) 정의 및 관리', 'SetupPage.jsx'],
  [3, '사원소속 (Employee)', '완료', '/employee', '구성원 기본 정보 및 인건비(급여) 관리, 부서/직종/직급 배부 기초 데이터', 'EmployeePage.jsx'],
  [4, '수익 (Revenue)', '완료', '/revenue', '진료과별, 의사별 수익 데이터 집계, 수익 전체 규모 확인 (입력/업로드)', 'RevenueInputPage.jsx'],
  [5, '비용 (Cost)', '완료', '/cost', '병원 운영 발생 모든 비용(인건비, 재료비, 관리운영비) 부서별/계정별 집계', 'CostPage.jsx'],
  [6, '환자통계 (PatientStats)', '완료', '/patient-stats', '진료과별 환자 수, 재원일수 등 통계 지표 관리 (원무과 비용 배부 드라이버)', 'PatientStatsPage.jsx'],
  [7, '원가배부값 (Allocation)', '완료', '/allocation-value', '비용 분배 기준이 되는 드라이버(인원수, 면적, 처방건수 등) 지표 관리', 'AllocationValuePage.jsx'],
  [8, '계산로직 (Logic)', '완료', '/logic', '계정 매핑, 활동 비율, 활동 로직 등 4단계 배부 룰 설정 시스템 (핵심 규칙)', 'LogicPage.jsx'],
  [9, '실행 (Execution)', '완료', '/run', '설정된 데이터와 로직을 바탕으로 ABC 계산 알고리즘 엔진 순차적 실행', 'ExecutionPage.jsx'],
  [10, '결과 (Result)', '완료', '/result', '최종 손익 시각화, 진료과별 막대형/파이형 차트 요약 및 직접/간접비 배부 상세표', 'ResultPage.jsx']
];
const wsFeatures = xlsx.utils.aoa_to_sheet(wsFeaturesData);
wsFeatures['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 20 }, { wch: 70 }, { wch: 25 }];
xlsx.utils.book_append_sheet(wb, wsFeatures, "화면 및 기능구현 목록");

// Sheet 3: 데이터베이스 구조 (Database mappings)
const wsDbData = [
  ['화면/기능', '데이터 저장소 목적', 'DB 테이블', '저장소 Key (generic_store 등)', '비고'],
  ['기초코드', '부서, 계정코드 등 마스터 관리', 'generic_store', 'clinic_departments 등', 'JSON 직렬화 저장 구조'],
  ['사원소속', '직원 및 급여 관리', 'generic_store', 'clinic_employees', ''],
  ['수익', '부서별/의사별 수익', 'generic_store', 'clinic_revenue_data', ''],
  ['비용', '과목별 비용 원장', 'generic_store', 'clinic_cost_data', ''],
  ['환자통계', '환자 수 등 활동 지표', 'generic_store', 'clinic_patient_stats', ''],
  ['원가배부값', '배부기준(드라이버)', 'driver_data', '-', '전용 테이블 운용'],
  ['계산로직', 'ABC 원가 배부 규칙', 'allocation_rules', '-', '전용 테이블 운용']
];
const wsDb = xlsx.utils.aoa_to_sheet(wsDbData);
wsDb['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 30 }, { wch: 30 }];
xlsx.utils.book_append_sheet(wb, wsDb, "데이터베이스 구조");

// Write to file
xlsx.writeFile(wb, outputPath);
console.log('Excel file successfully updated and formatted.');
