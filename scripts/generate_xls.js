import XLSX from 'xlsx';
import path from 'path';

const data = {
    "사원소속 및 인건비": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["id", "고유 식별자", "Number", "생성 시 자동 부여"],
        ["dept", "소속 부서", "String", "부서 기초코드 연동"],
        ["job", "직종", "String", "의사직, 간호직, 행정직 등"],
        ["count", "인원수", "Number", "해당 부서/직종의 인원"],
        ["avgSalary", "평균 급여", "Number", "1인당 평균 급여액"],
        ["note", "비고", "String", "추가 메모"]
    ],
    "비용(수작업)": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["id", "고유 식별자", "Number", "-"],
        ["dept", "발생 부서", "String", "비용이 귀속되는 부서"],
        ["accCategory", "계정 분류", "String", "의료비용, 의료외비용 등"],
        ["account", "계정명", "String", "재료비, 상각비, 관리비 등 표준계정"],
        ["method", "입력 방법", "String", "'수작업' (자동 연동과 구분)"],
        ["amount", "금액", "Number", "발생 비용 총액"],
        ["note", "비고", "String", "세부 내역 메모"]
    ],
    "환자통계": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["id", "고유 식별자", "Number", "-"],
        ["driver", "통계 구분", "String", "외래환자수, 수술시간 등 드라이버명"],
        ["prescDept", "진료과(처방)", "String", "원가대상 관점 1"],
        ["performDept", "시행과", "String", "원가대상 관점 2"],
        ["prescDoc", "처방의사", "String", "원가대상 관점 3"],
        ["performDoc", "시행의사", "String", "원가대상 관점 4"],
        ["value", "통계 값", "Number", "건수, 수량, 시간 등"],
        ["note", "비고", "String", "-"]
    ],
    "드라이버 정의": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["id", "고유 식별자", "Number", "-"],
        ["type", "구분", "String", "원가대상 / 부서"],
        ["source", "생성 기준", "String", "수익, 환자통계, 사원소속, 비용 등"],
        ["driver", "드라이버 명", "String", "최종 생성될 드라이버의 이름"],
        ["valueType", "값의 종류", "String", "금액, 건수, 인원수, 총인건비 등"],
        ["condition", "생성 조건", "String", "필드=값 형태의 필터링 조건"],
        ["note", "비고", "String", "로직 설명"]
    ],
    "수익 테이블": [
        ["필드명", "설명", "데이터 타입", "비고"],
        ["id", "고유 식별자", "Number", "-"],
        ["dept", "진료과", "String", "처방부서"],
        ["performDept", "시행과", "String", "실제 행위 부서"],
        ["prescDoc", "처방의사", "String", "-"],
        ["performDoc", "시행의사", "String", "-"],
        ["patientType", "환자구분", "String", "외래/입원"],
        ["actMaterial", "행위재료", "String", "행위/재료"],
        ["accCategory", "계정분류", "String", "-"],
        ["account", "계정", "String", "-"],
        ["amount", "금액", "Number", "수익 금액"]
    ]
};

const wb = XLSX.utils.book_new();

Object.entries(data).forEach(([sheetName, rows]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
});

const fileName = "원가계산_테이블_명세서.xlsx";
const filePath = path.join(process.cwd(), fileName);
XLSX.writeFile(wb, filePath);

console.log(`Excel file created at: ${filePath}`);
