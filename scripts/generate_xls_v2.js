import XLSX from 'xlsx';
import path from 'path';

const data = {
    "기초코드(부서_원가대상)": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["id", "고유 식별자", "Number", "-"],
        ["name", "조직/부서명", "String", "-"],
        ["level", "조직 레벨", "Number", "1(최상위) ~ N"],
        ["isDept", "부서 여부", "Boolean", "비용 집계 대상 여부"],
        ["isCostObj", "원가대상 여부", "Boolean", "최종 수익/원가 배부 대상 여부"],
        ["note", "비고", "String", "-"]
    ],
    "표준 기초코드": [
        ["구분", "항목명", "설명"],
        ["활동(Activity)", "외래활동, 회진활동, 수술활동, 검사활동, 행정활동", "병원 표준 5대 활동"],
        ["직종(Job)", "의사직, 간호직, 보건직, 행정직, 기타직", "-"],
        ["계정(Account)", "외래수익, 입원수익, 인건비, 재료비, 상각비, 관리비", "표준 손익 계정"],
        ["드라이버(Driver)", "수익비, 환자수, 시간, 면적, 인원수 등", "배부 기준 전체 목록"]
    ],
    "직접비(수작업)": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["id", "고유 식별자", "Number", "-"],
        ["dept", "발생 부서", "String", "비용이 귀속되는 부서"],
        ["accCategory", "계정 분류", "String", "의료비용 등"],
        ["account", "계정명", "String", "재료비, 상각비 등"],
        ["amount", "금액", "Number", "발생 비용 총액"],
        ["note", "비고", "String", "-"]
    ],
    "배부드라이버 정의": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["id", "고유 식별자", "Number", "-"],
        ["type", "구분", "String", "원가대상 / 부서"],
        ["source", "생성 기준", "String", "수익, 환자통계, 사원소속 등"],
        ["driver", "드라이버 명", "String", "-"],
        ["valueType", "값의 종류", "String", "금액, 건수, 인원수 등"],
        ["condition", "생성 조건", "String", "데이터 추출 필터 조건"],
        ["note", "비고", "String", "-"]
    ],
    "계정로직": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["dept", "부서", "String", "-"],
        ["category", "계정분류", "String", "-"],
        ["account", "계정명", "String", "-"],
        ["amount", "금액", "Number", "-"],
        ["driver", "배부 드라이버", "String", "1차 배부 기준"],
        ["view", "배부 관점", "String", "전체, 진료과, 시행과 등"],
        ["scope", "배부 범위", "String", "전체 또는 특정 부서"]
    ],
    "활동비율": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["dept", "부서", "String", "-"],
        ["jobType", "직종", "String", "-"],
        ["activity", "활동명", "String", "표준 활동"],
        ["ratio", "비율(수량)", "Number", "부서/직종별 투입 비중"]
    ],
    "활동로직": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["dept", "배부 부서", "String", "-"],
        ["activity", "원가 활동", "String", "-"],
        ["driver", "배부 드라이버", "String", "최종 배부 기준"],
        ["view", "배부 관점", "String", "진료과, 시행과 등"],
        ["scope", "배부 범위", "String", "-"]
    ],
    "원가계산결과": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["treatDept", "진료과(처방)", "String", "원가대상 1"],
        ["execDept", "시행과", "String", "원가대상 2"],
        ["treatDoc", "처방의사", "String", "원가대상 3"],
        ["execDoc", "시행의사", "String", "원가대상 4"],
        ["revenue", "수익", "Number", "-"],
        ["cost", "원가", "Number", "배부 완료된 총 원가"],
        ["profit", "손익", "Number", "수익 - 원가"]
    ],
    "수익 테이블": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["dept", "진료과", "String", "-"],
        ["performDept", "시행과", "String", "-"],
        ["prescDoc", "처방의사", "String", "-"],
        ["performDoc", "시행의사", "String", "-"],
        ["patientType", "환자구분", "String", "-"],
        ["actMaterial", "행위재료", "String", "-"],
        ["amount", "금액", "Number", "수익 원천 데이터"]
    ]
};

const wb = XLSX.utils.book_new();

Object.entries(data).forEach(([sheetName, rows]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
});

const fileName = "원가계산_통합_테이블_명세서.xlsx";
const filePath = path.join(process.cwd(), fileName);
XLSX.writeFile(wb, filePath);

console.log(`Excel file created at: ${filePath}`);
