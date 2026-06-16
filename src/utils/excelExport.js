import * as XLSX from 'xlsx';

/**
 * 필드명 한글 변환 매핑 사전
 */
const HEADER_MAPPING = {
    dept: "부서/진료과",
    dept_name: "부서",
    performDept: "시행과",
    prescDept: "진료과(처방)",
    prescDoc: "처방의사",
    performDoc: "시행의사",
    treatDept: "진료과(처방)",
    treatDoc: "처방의사",
    amount: "금액",
    revenue: "수익",
    cost: "원가",
    profit: "손익",
    ratio: "비율",
    driver: "배부드라이버",
    view: "배부관점",
    scope: "배부범위",
    job: "직종",
    jobType: "직종",
    job_type: "직종",
    count: "인원수",
    headcount: "인원수",
    avgSalary: "평균급여",
    avg_salary: "인건비(평균)",
    note: "비고",
    patientType: "환자구분",
    actMaterial: "행위재료",
    accCategory: "계정분류",
    category: "계정분류",
    account: "계정명",
    activity: "활동명",
    type: "구분",
    source: "생성기준",
    valueType: "값종류",
    value: "값",
    condition: "생성조건",
    name: "이름",
    emp_name: "이름",
    level: "레벨",
    isDept: "부서여부",
    isCostObj: "원가대상여부",
    costing_yn: "투입여부",
    id: "ID",
    generatedAt: "생성일시"
};

// 역방향 매핑 (한글 -> 영문 키)
const REVERSE_MAPPING = Object.entries(HEADER_MAPPING).reduce((acc, [key, value]) => {
    // 중복되는 한글 값이 있을 경우 첫 번째(또는 특정) 영문 키를 우선하도록 할 수 있지만,
    // 여기서는 덮어쓰기 방식으로 마지막 키가 남음 (일반적으로 업로드 양식이 각 화면마다 다르므로 큰 문제 없음)
    acc[value] = key;
    return acc;
}, {});

/**
 * 데이터를 엑셀로 내보내는 함수
 * @param {Array} data 내보낼 데이터 배열 (객체 배열)
 * @param {string} fileName 파일명 (확장자 제외)
 * @param {string} sheetName 시트명
 */
export const exportToExcel = (data, fileName = "download", sheetName = "Sheet1") => {
    if (!data || data.length === 0) {
        alert("내보낼 데이터가 없습니다.");
        return;
    }

    // 1. 데이터의 키(필드명)를 한글 헤더로 변환
    const excelData = data.map(item => {
        const newItem = {};
        Object.keys(item).forEach(key => {
            const koreanHeader = HEADER_MAPPING[key] || key;
            newItem[koreanHeader] = item[key];
        });
        return newItem;
    });

    // 2. 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 3. 헤더 스타일 서식 (열 너비 자동 조정)
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const cols = [];
    for (let i = range.s.c; i <= range.e.c; i++) {
        cols.push({ wch: 15 }); // 기본 너비 설정
    }
    worksheet['!cols'] = cols;

    // 4. 워크북 생성 및 시트 추가
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 5. 파일 다운로드 실행
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * 엑셀 파일을 읽어서 데이터를 반환하는 함수
 * @param {File} file 업로드된 엑셀 파일
 * @returns {Promise<Array>} 영문 키로 변환된 데이터 객체 배열
 */
export const importFromExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // 한글 헤더를 다시 영문 키로 변환
                const convertedData = jsonData.map(item => {
                    const newItem = {};
                    Object.keys(item).forEach(koreanHeader => {
                        // REVERSE_MAPPING에 있으면 영문 키 사용, 없으면 한글 헤더 그대로 사용
                        const englishKey = REVERSE_MAPPING[koreanHeader] || koreanHeader;
                        newItem[englishKey] = item[koreanHeader];
                    });
                    return newItem;
                });

                resolve(convertedData);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};
