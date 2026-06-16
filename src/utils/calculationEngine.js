/**
 * ABC(활동기준) 원가계산 엔진 - 4관점 최적화 버전 (가우스 소거법 적용)
 */
import { api } from '../api';

const norm = (str) => !str || str === '-' || str === '미지정' ? '' : String(str).trim();

// --- 가우스 소거법 (Gaussian Elimination) ---
function solveLinearSystem(A, b) {
    const n = b.length;
    // Augment matrix
    const M = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
        // Find pivot
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
                maxRow = k;
            }
        }
        // Swap
        const temp = M[i];
        M[i] = M[maxRow];
        M[maxRow] = temp;

        const pivot = M[i][i];
        if (Math.abs(pivot) < 1e-12) {
            continue; // Singular / zero pivot, means no outgoing allocation
        }

        for (let j = i; j <= n; j++) {
            M[i][j] /= pivot;
        }

        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = M[k][i];
                for (let j = i; j <= n; j++) {
                    M[k][j] -= factor * M[i][j];
                }
            }
        }
    }
    return M.map(row => row[n]);
}

export const runFullCalculation = async (year, month, onProgress) => {
    // 1. 데이터 로드
    const revenueDataRaw = await api.getRevenueData(year, month) || [];
    const manualCostsRaw = await api.getExpenseData(year, month) || [];
    const laborDataRaw = await api.getPayment(year, month) || [];
    const activityRatioDataRaw = await api.getActivityRatio(year, month) || [];
    const accountRulesRaw = await api.getAllocationRulesAccount(year, month) || [];
    const activityLogicsRaw = await api.getAllocationRulesActivity(year, month) || {};
    const driverDataRaw = await api.getDriverData(year, month) || [];

    // --- 데이터 표준화 ---
    const revenueData = revenueDataRaw.map(row => ({
        ...row,
        abc_order_dept: row.abc_order_dept || row.treatDept || row.dept || '',
        abc_oper_dept: row.abc_oper_dept || row.execDept || row.performDept || '',
        abc_order_dct: row.abc_order_dct || row.prescDoc || row.treatDoc || '',
        abc_oper_dct: row.abc_oper_dct || row.performDoc || row.execDoc || '',
        amt: parseFloat(row.amt || row.amount || 0)
    }));

    const manualCosts = manualCostsRaw
        .filter(row => {
            if (row.costing_yn === 'N' || row.costing_yn === 'n') return false;
            const cat = row.account_category || row.accCategory || '의료비용';
            return !cat.includes('수익');
        })
        .map(row => ({
            ...row,
            dept_code: row.dept_code || row.dept || '',
            account_category: row.account_category || row.accCategory || '의료비용',
            account_code: row.account_code || row.account || row.account_name || '',
            amt: parseFloat(row.amt || row.amount || 0)
        }));

    const laborData = laborDataRaw.map(row => ({
        ...row,
        dept_code: row.dept_code || row.dept || row.dept_name || '',
        amt: parseFloat(row.amt || row.avg_salary || row.avgSalary || 0),
        qty: parseFloat(row.qty || row.headcount || row.count || 1)
    }));

    const activityRatioData = activityRatioDataRaw.map(row => ({
        ...row,
        dept_code: row.dept_code || row.dept || '',
        ratio: parseFloat(row.ratio || 0)
    }));

    const accountRules = {};
    accountRulesRaw.forEach(r => {
        const key = `${r.dept_code || r.dept}|${r.account_code || r.account || r.account_name}`;
        accountRules[key] = {
            method: r.allocation_method || '04.원가대상 배부',
            driver: r.driver || '',
            base: r.allocation_base || r.view || '전체',
            scope: r.allocation_scope || r.scope || '전체'
        };
    });

    const activityLogics = {};
    activityLogicsRaw.forEach(logic => {
        const key = `${logic.dept_code || logic.dept}|${logic.activity_name || logic.activity}`;
        activityLogics[key] = {
            method: logic.allocation_method || logic.method || '04.원가대상 배부',
            driver: logic.driver || '',
            base: logic.allocation_base || logic.view || '전체',
            scope: logic.allocation_scope || logic.scope || '전체'
        };
    });

    const results = {
        totalRevenue: 0,
        totalCost: 0,
        steps: [],
        finalTable: []
    };

    let totalInputCost = 0;

    const addStep = async (title, message, data = null) => {
        results.steps.push({ title, message, data });
        if (onProgress) await onProgress(title, message, data);
    };

    // --- 원가대상(Target) 풀 구성 ---
    const revenueMap = {}; 
    revenueData.forEach(row => {
        const key = `${row.abc_order_dept}|${row.abc_oper_dept}|${row.abc_order_dct}|${row.abc_oper_dct}`;
        if (!revenueMap[key]) {
            revenueMap[key] = { 
                abc_order_dept: row.abc_order_dept, abc_oper_dept: row.abc_oper_dept, 
                abc_order_dct: row.abc_order_dct, abc_oper_dct: row.abc_oper_dct, 
                revenue: 0, cost: 0, costBreakdown: {}
            };
        }
        revenueMap[key].revenue += row.amt;
        results.totalRevenue += row.amt;
    });

    // 모든 부서 추출
    const allDeptsSet = new Set();
    manualCosts.forEach(c => allDeptsSet.add(c.dept_code));
    laborData.forEach(l => allDeptsSet.add(l.dept_code));
    activityRatioData.forEach(r => allDeptsSet.add(r.dept_code));
    revenueData.forEach(r => {
        if(r.abc_order_dept) allDeptsSet.add(r.abc_order_dept);
        if(r.abc_oper_dept) allDeptsSet.add(r.abc_oper_dept);
    });
    const depts = Array.from(allDeptsSet).filter(d => d && d.trim() !== '');

    // 공통 드라이버 추출 함수 (부서 단위)
    const getDeptDriverValue = (deptCode, driver, base) => {
        let val = 0;
        driverDataRaw.forEach(d => {
            if (d.driver_code === driver) {
                if (base === '진료과' && norm(d.abc_order_dept) === norm(deptCode)) val += parseFloat(d.value || 0);
                else if (base === '시행과' && norm(d.abc_oper_dept) === norm(deptCode)) val += parseFloat(d.value || 0);
                else if (base === '부서' && norm(d.dept_code) === norm(deptCode)) val += parseFloat(d.value || 0);
                else if (base === '전체') {
                    if (norm(d.dept_code) === norm(deptCode) || norm(d.abc_order_dept) === norm(deptCode) || norm(d.abc_oper_dept) === norm(deptCode)) {
                        val += parseFloat(d.value || 0);
                    }
                }
            }
        });
        return val;
    };

    // --- 관점 1: 계정원가 배부 (가우스 소거법) ---
    await addStep("관점 1: 계정원가 배부", "공통 계정원가를 상호배부 행렬로 배부합니다.");
    const deptDirectCost = {};
    depts.forEach(d => deptDirectCost[d] = 0);

    const b1 = new Array(depts.length).fill(0);
    const P1 = Array.from(Array(depts.length), () => new Array(depts.length).fill(0));

    const manualStep4Costs = [];
    const manualStep2Costs = [];
    const deptFirstRule = {};

    manualCosts.forEach(cost => {
        totalInputCost += cost.amt;
        const key = `${cost.dept_code}|${cost.account_code}`;
        const rule = accountRules[key];
        
        if (!rule) {
            throw new Error(`[원가계산 중단] 계정 배부규칙 누락\n- 비용정보: [${cost.dept_code}] 부서의 [${cost.account_name}] 계정\n- 해당 부서/계정에 대한 배부 로직이 설정되어 있지 않습니다.`);
        }
        
        if (rule.method === '01.계정원가 배부') {
            const dIdx = depts.indexOf(cost.dept_code);
            if (dIdx !== -1) {
                b1[dIdx] += cost.amt;
                
                if (!deptFirstRule[cost.dept_code]) {
                    deptFirstRule[cost.dept_code] = { cost, rule };
                }
            } else {
                throw new Error(`[원가계산 중단] 부서 매칭 실패\n- 비용정보: [${cost.dept_code}] 부서의 [${cost.account_name}] 계정\n- 해당 부서가 전체 부서 목록에 존재하지 않습니다.`);
            }
        } else if (rule.method === '02.활동원가 전환') {
            manualStep2Costs.push({ cost, rule });
        } else {
            manualStep4Costs.push({ cost, rule });
        }
    });

    depts.forEach((fromDept, j) => {
        if (b1[j] > 0 && deptFirstRule[fromDept]) {
            const { cost, rule } = deptFirstRule[fromDept];
            let totalDriver = 0;
            const driverVals = new Array(depts.length).fill(0);
            
            depts.forEach((toDept, i) => {
                let match = true;
                if (rule.scope !== '전체' && rule.scope !== '병원' && toDept !== rule.scope) match = false;
                if (match) {
                    const val = getDeptDriverValue(toDept, rule.driver, rule.base);
                    driverVals[i] = val;
                    totalDriver += val;
                }
            });

            if (totalDriver === 0) {
                const errFormat = `[원가계산 중단] 계정원가 배부 드라이버 매칭 실패
- 비용정보: [${cost.dept_code}] - [${cost.account_code}] - [${cost.amt.toLocaleString()}원]
- 배부로직: [${rule.method}] - 드라이버:[${rule.driver}] - 관점:[${rule.base}] - 타겟:[${rule.scope}]
- 중단원인: 타겟에 대한 ${rule.driver} 실적 데이터가 존재하지 않거나 합계가 0입니다.`;
                throw new Error(errFormat);
            }

            for (let i = 0; i < depts.length; i++) {
                P1[i][j] = driverVals[i] / totalDriver;
            }
        }
    });

    const I_minus_P1 = Array.from(Array(depts.length), () => new Array(depts.length).fill(0));
    for (let i = 0; i < depts.length; i++) {
        for (let j = 0; j < depts.length; j++) {
            I_minus_P1[i][j] = (i === j ? 1 : 0) - P1[i][j];
        }
    }
    const X1 = solveLinearSystem(I_minus_P1, b1);

    const deptCosts = {};
    depts.forEach((d, i) => {
        let received = 0;
        let given = 0;
        for (let j = 0; j < depts.length; j++) {
            received += P1[i][j] * X1[j];
            given += P1[j][i] * X1[i];
        }
        
        let retained = b1[i] + received - given;
        if (Math.abs(retained) < 1e-9) retained = 0;
        
        deptCosts[d] = retained;
    });

    // --- 관점 2: 활동원가 전환 ---
    await addStep("관점 2: 활동원가 전환", "인건비와 계정원가를 활동으로 분해합니다.");
    laborData.forEach(l => {
        const laborAmt = l.amt * l.qty;
        totalInputCost += laborAmt;
        deptCosts[l.dept_code] = (deptCosts[l.dept_code] || 0) + laborAmt;
    });

    manualStep2Costs.forEach(({ cost }) => {
        deptCosts[cost.dept_code] = (deptCosts[cost.dept_code] || 0) + cost.amt;
    });

    const activityCosts = {};
    const deptTotalRatio = {};
    activityRatioData.forEach(r => {
        deptTotalRatio[r.dept_code] = (deptTotalRatio[r.dept_code] || 0) + r.ratio;
    });

    const activitiesList = []; 
    activityRatioData.forEach(r => {
        if (r.ratio > 0) {
            const actName = r.activity_name || r.activity || '';
            const key = `${r.dept_code}|${actName}`;
            activitiesList.push({ dept: r.dept_code, act: actName, key, ratio: r.ratio });
        }
    });

    activitiesList.forEach(item => {
        const deptAmt = deptCosts[item.dept] || 0;
        const totalR = deptTotalRatio[item.dept] || 1; 
        const actAmt = deptAmt * (item.ratio / totalR);
        activityCosts[item.key] = (activityCosts[item.key] || 0) + actAmt;
    });
    
    depts.forEach(d => {
        if ((deptCosts[d] > 1) && (!deptTotalRatio[d] || deptTotalRatio[d] === 0)) {
             throw new Error(`[원가계산 중단] 활동비율 미설정 부서 발견\n- 부서: [${d}]의 잔여원가가 존재하지만 활동비율이 설정되지 않아 전환할 수 없습니다.`);
        }
    });

    // --- 관점 3: 활동원가 타부서 배부 (가우스 소거법) ---
    await addStep("관점 3: 타부서 활동 배부", "지원활동 원가를 타 활동으로 상호배부 행렬 적용합니다.");
    
    const b3 = new Array(activitiesList.length).fill(0);
    const P3 = Array.from(Array(activitiesList.length), () => new Array(activitiesList.length).fill(0));

    activitiesList.forEach((fromAct, j) => {
        const logic = activityLogics[fromAct.key];
        if (!logic) {
            throw new Error(`[원가계산 중단] 활동 배부규칙 누락\n- 비용정보: [${fromAct.dept}] 부서의 [${fromAct.act}] 활동\n- 해당 부서/활동에 대한 배부 로직이 설정되어 있지 않습니다.`);
        }
        
        if (logic.method === '03.활동원가 타부서 배부') {
            b3[j] = activityCosts[fromAct.key] || 0;

            let totalDriver = 0;
            const targetDeptDriverVals = {};
            
            depts.forEach(toDept => {
                let match = true;
                if (logic.scope !== '전체' && logic.scope !== '병원' && toDept !== logic.scope) match = false;
                if (match && toDept !== fromAct.dept) {
                    const val = getDeptDriverValue(toDept, logic.driver, logic.base);
                    targetDeptDriverVals[toDept] = val;
                    totalDriver += val;
                }
            });

            if (totalDriver === 0 && b3[j] > 0) {
                const errFormat = `[원가계산 중단] 활동원가 배부 드라이버 매칭 실패
- 비용정보: [${fromAct.dept}] - [${fromAct.act}] - [${b3[j].toLocaleString()}원]
- 배부로직: [${logic.method}] - 드라이버:[${logic.driver}] - 관점:[${logic.base}] - 타겟:[${logic.scope}]
- 중단원인: 타겟 부서들에 대한 ${logic.driver} 실적 데이터가 존재하지 않거나 합계가 0입니다.`;
                throw new Error(errFormat);
            }

            if (totalDriver > 0) {
                activitiesList.forEach((toAct, i) => {
                    const deptShare = (targetDeptDriverVals[toAct.dept] || 0) / totalDriver;
                    if (deptShare > 0) {
                        const actShareInDept = toAct.ratio / deptTotalRatio[toAct.dept];
                        P3[i][j] = deptShare * actShareInDept;
                    }
                });
            }
        }
    });

    const I_minus_P3 = Array.from(Array(activitiesList.length), () => new Array(activitiesList.length).fill(0));
    for (let i = 0; i < activitiesList.length; i++) {
        for (let j = 0; j < activitiesList.length; j++) {
            I_minus_P3[i][j] = (i === j ? 1 : 0) - P3[i][j];
        }
    }
    const X3 = solveLinearSystem(I_minus_P3, b3);

    const finalActivityCosts = {};
    activitiesList.forEach((a, i) => {
        const logic = activityLogics[a.key];
        if (!logic) {
            throw new Error(`[원가계산 중단] 활동 배부규칙 누락\n- 비용정보: [${a.dept}] 부서의 [${a.act}] 활동\n- 해당 부서/활동에 대한 배부 로직이 설정되어 있지 않습니다.`);
        }
        let retained = (logic.method === '04.원가대상 배부') ? (activityCosts[a.key] || 0) : 0;
        
        let received = 0;
        for (let j = 0; j < activitiesList.length; j++) {
            received += P3[i][j] * X3[j];
        }
        finalActivityCosts[a.key] = retained + received;
    });

    // --- 관점 4: 원가대상 배부 ---
    await addStep("관점 4: 최종 원가대상 귀속", "모든 원가를 최종 원가대상(진료과/의사)에 귀속시킵니다.");

    const allocateToTargets = (amount, logic, sourceLabel) => {
        if (amount <= 0.001) return;
        
        const matchingTargets = Object.values(revenueMap).filter(target => {
            let matches = true;
            if (logic.base === '진료과' && logic.scope !== '전체' && logic.scope !== '병원' && target.abc_order_dept !== logic.scope) matches = false;
            if (logic.base === '시행과' && logic.scope !== '전체' && logic.scope !== '병원' && target.abc_oper_dept !== logic.scope) matches = false;
            if (logic.base === '처방의사' && logic.scope !== '전체' && logic.scope !== '병원' && target.abc_order_dct !== logic.scope) matches = false;
            if (logic.base === '시행의사' && logic.scope !== '전체' && logic.scope !== '병원' && target.abc_oper_dct !== logic.scope) matches = false;
            return matches;
        });

        if (matchingTargets.length === 0) {
            throw new Error(`[원가계산 중단] 대상 매칭 실패\n- 대상비용: ${sourceLabel}\n- 관점(${logic.base})과 타겟범위(${logic.scope})에 부합하는 대상이 존재하지 않습니다.`);
        }

        let totalDriverValue = 0;
        const targetDriverValues = matchingTargets.map(target => {
            const dRow = driverDataRaw.find(d => 
                d.driver_code === logic.driver && 
                (
                    (logic.base === '시행과' && norm(d.abc_oper_dept) === norm(target.abc_oper_dept) && norm(d.abc_oper_dct) === norm(target.abc_oper_dct)) ||
                    (logic.base === '진료과' && norm(d.abc_order_dept) === norm(target.abc_order_dept) && norm(d.abc_order_dct) === norm(target.abc_order_dct)) ||
                    (logic.base === '시행의사' && 
                        (norm(d.abc_oper_dct) === norm(target.abc_oper_dct) || norm(d.dept_code) === norm(target.abc_oper_dct)) &&
                        (!d.abc_oper_dept || norm(d.abc_oper_dept) === norm(target.abc_oper_dept))
                    ) ||
                    (logic.base === '처방의사' && 
                        (norm(d.abc_order_dct) === norm(target.abc_order_dct) || norm(d.dept_code) === norm(target.abc_order_dct)) &&
                        (!d.abc_order_dept || norm(d.abc_order_dept) === norm(target.abc_order_dept))
                    ) ||
                    (logic.base === '전체' && norm(d.abc_oper_dept) === norm(target.abc_oper_dept) && norm(d.abc_oper_dct) === norm(target.abc_oper_dct)) 
                )
            );
            const val = dRow ? parseFloat(dRow.value || 0) : 0;
            totalDriverValue += val;
            return val;
        });

        if (totalDriverValue === 0) {
            throw new Error(`[원가계산 중단] 04.원가대상 배부 드라이버 매칭 실패
- 비용정보: ${sourceLabel} - [${amount.toLocaleString()}원]
- 배부로직: [${logic.method}] - 드라이버:[${logic.driver}] - 관점:[${logic.base}] - 타겟:[${logic.scope}]
- 중단원인: 타겟 원가대상들에 대한 ${logic.driver} 실적 데이터가 존재하지 않거나 합계가 0입니다.`);
        }

        matchingTargets.forEach((target, idx) => {
            const ratio = targetDriverValues[idx] / totalDriverValue;
            const allocated = amount * ratio;
            target.cost += allocated;
            target.costBreakdown[sourceLabel] = (target.costBreakdown[sourceLabel] || 0) + allocated;
            results.totalCost += allocated;
        });
    };

    manualStep4Costs.forEach(({ cost, rule }) => {
        allocateToTargets(cost.amt, rule, `[계정] ${cost.dept_code}_${cost.account_code}`);
    });

    Object.entries(finalActivityCosts).forEach(([actKey, amount]) => {
        const logic = activityLogics[actKey];
        if (!logic) {
            const [dept, act] = actKey.split('|');
            throw new Error(`[원가계산 중단] 활동 배부규칙 누락\n- 비용정보: [${dept}] 부서의 [${act}] 활동\n- 해당 부서/활동에 대한 배부 로직이 설정되어 있지 않습니다.`);
        }
        if (logic.method === '04.원가대상 배부' && amount > 0.001) {
            allocateToTargets(amount, logic, `[활동] ${actKey}`);
        }
    });

    // --- 최종 계산 및 무결성 검증 ---
    results.finalTable = Object.values(revenueMap).map(item => ({
        ...item,
        profit: item.revenue - item.cost
    })).sort((a, b) => b.profit - a.profit);

    await addStep("관점 5: 원가계산 보고서 생성", "최종 원가대상별 원가 귀속 결과를 분석하여 검증용 보고서 데이터를 생성합니다.");
    results.reportTable = [];
    results.finalTable.forEach(item => {
        Object.entries(item.costBreakdown || {}).forEach(([sourceLabel, cost]) => {
            if (cost > 0.001) {
                let dept = '';
                let activity_name = '';
                const matchAccount = sourceLabel.match(/^\[계정\] (.*?)_(.*)$/);
                const matchActivity = sourceLabel.match(/^\[활동\] (.*?)\|(.*)$/);
                
                if (matchAccount) {
                    dept = matchAccount[1];
                    activity_name = matchAccount[2];
                } else if (matchActivity) {
                    dept = matchActivity[1];
                    activity_name = `[활동] ${matchActivity[2]}`;
                } else {
                    activity_name = sourceLabel;
                }
                results.reportTable.push({
                    abc_order_dept: item.abc_order_dept,
                    abc_oper_dept: item.abc_oper_dept,
                    abc_order_dct: item.abc_order_dct,
                    abc_oper_dct: item.abc_oper_dct,
                    dept,
                    activity_name,
                    cost
                });
            }
        });
    });

    // 무결성 검증 (오차 1.0원 이하)
    if (Math.abs(totalInputCost - results.totalCost) > 1.0) {
        throw new Error(`[원가계산 무결성 오류] 총 투입 원가(${totalInputCost.toLocaleString()}원)와 최종 배부 원가(${results.totalCost.toLocaleString()}원)가 일치하지 않습니다.\n오차: ${(totalInputCost - results.totalCost).toFixed(2)}원`);
    }

    await api.saveCostingResult(year, month, results.finalTable);
    await api.saveCostingReport(year, month, results.reportTable);
    await addStep("산출 완료", `총 ${results.finalTable.length}건의 의사별 원가계산이 완료되었습니다. (검증 오차: ${(totalInputCost - results.totalCost).toFixed(2)}원)`);

    // Save process steps
    await api.saveCostingProcess(year, month, results.steps);

    return results;
};
