const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DATABASE = 'graduation_tracker.db';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'templates')));

let db;
function initDb() {
    db = new sqlite3.Database(DATABASE, (err) => {
        if (err) {
            console.error('資料庫連接錯誤:', err.message);
        } else {
            console.log('成功連接到 SQLite 資料庫。');
            db.serialize(() => {

                db.run(`
                    CREATE TABLE IF NOT EXISTS courses (
                        course_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        type TEXT NOT NULL,
                        subtype TEXT,
                        credits INTEGER NOT NULL,
                        max_credits_cap INTEGER, -- 允許為空值 (NULL)
                        is_special_requirement BOOLEAN NOT NULL DEFAULT FALSE,
                        is_default_completed BOOLEAN NOT NULL DEFAULT FALSE
                    )
                `);

                db.run(`
                    CREATE TABLE IF NOT EXISTS student_progress (
                        progress_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        course_id INTEGER UNIQUE,
                        completed BOOLEAN NOT NULL,
                        FOREIGN KEY (course_id) REFERENCES courses(course_id)
                    )
                `);

                db.run(`
                    CREATE TABLE IF NOT EXISTS credit_targets (
                        target_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        category TEXT NOT NULL UNIQUE,
                        target_credits INTEGER NOT NULL
                    )
                `);

                // 初始課程
                const initialCoursesData = [
                    ['國文', 'required_common', null, 4, null, false, true],
                    ['外語(一)', 'required_common', null, 4, null, false, true],
                    ['外語(二)', 'required_common', null, 4, null, false, true],
                    ['生命關懷', 'required_common', null, 1, null, false, true],
                    ['思維方法', 'required_common', null, 1, null, false, true],
                    ['數位自主學習', 'required_common', null, 2, null, false, true],
                    ['職涯錨定', 'required_common', null, 1, null, false, true],
                    ['人工智慧跨域應用', 'required_common', null, 1, null, false, true],
                    ['四次體育課', 'required_common', null, 0, null, true, true], 
                    ['五堂通識', 'required_common', null, 10, null, false, true], 
                    ['英文能力認證：全民英檢中高級複試/多益聽讀800/雅思6.0/托福 iBT90', 'required_common', null, 0, null, true, false],
                    ['美育活動(3/4)', 'required_common', null, 0, null, true, false],
                    ['英美文學作品導讀', 'required_year1', null, 4, null, false, false],
                    ['西洋文學概論', 'required_year1', null, 6, null, false, false],
                    ['英文會話(一)', 'required_year1', null, 4, null, false, true],
                    ['英文寫作(一)', 'required_year1', null, 4, null, false, true],

                    ['英語語言學概論', 'required_year2', null, 6, null, false, true],
                    ['英文會話(二)', 'required_year2', null, 4, null, false, true],
                    ['英文寫作(二)', 'required_year2', null, 4, null, false, true],

                    ['英語演講', 'required_year3', null, 4, null, false, false],
                    ['中英翻譯與習作', 'required_year3', null, 4, null, false, false],
                    ['英文寫作(三)', 'required_year3', null, 4, null, false, true],

                    ['英文專題研究寫作與簡報', 'required_year4', null, 2, null, false, false],

                    ['英美小說選讀', 'elective', 'literature', 4, null, false, true],
                    ['當代奇幻文學', 'elective', 'literature', 2, null, false, true],
                    ['英文文法與寫作(一)', 'elective', 'writing', 2, null, false, true],
                    ['英文文法與寫作(二)', 'elective', 'writing', 2, null, false, false],
                    ['華語口語與表達', 'elective', 'mutual', 2, null, false, true],
                    ['逐步口譯', 'elective', null, 4, null, false, false],
                    ['專業office套裝軟體(一)', 'elective', 'mutual', 2, null, false, true],
                    ['專業office套裝軟體(二)', 'elective', 'mutual', 2, null, false, true],
                    ['程式邏輯基礎', 'elective', 'mutual', 1, null, false, true],
                    ['程式與資料處理', 'elective', 'mutual', 1, null, false, true],
                    ['程式與資料結構', 'elective', 'mutual', 1, null, false, true],
                    ['程式與資料視覺化', 'elective', 'mutual', 1, null, false, true],
                    ['數位多媒體英語學習', 'elective', null, 2, null, false, true],
                    ['浪漫時期起英國文學', 'elective', 'literature', 6, null, false, false],
                    ['中英跟述', 'elective', null, 2, null, false, false],
                    ['輔系學分抵免', 'elective', 'mutual', 10, null, false, true], 

                    ['程式設計(一)', 'minor_required', null, 3, null, false, true],
                    ['巨量資料概論', 'minor_required', null, 3, null, false, true],
                    ['程式設計(二)', 'minor_required', null, 3, null, false, false],
                    ['資料庫導論', 'minor_required', null, 3, null, false, false],
                    ['資料分析軟體', 'minor_required', null, 3, null, false, false],
                    ['機率與統計', 'minor_required', null, 6, null, false, false],
                ];

                initialCoursesData.forEach(courseData => {
                    const [name, type, subtype, credits, max_credits_cap, is_special_requirement, is_default_completed] = courseData;
                    db.run(
                        "INSERT OR IGNORE INTO courses (name, type, subtype, credits, max_credits_cap, is_special_requirement, is_default_completed) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        [name, type, subtype, credits, max_credits_cap, is_special_requirement, is_default_completed ? 1 : 0],
                        function(err) {
                            if (err) {
                                console.error(`插入課程 ${name} 錯誤:`, err.message);
                            } else {
                                const courseId = this.lastID;
                                // 只有當課程是新插入時，才設定其進度
                                if (courseId) { 
                                    db.run(
                                        "INSERT OR REPLACE INTO student_progress (course_id, completed) VALUES (?, ?)",
                                        [courseId, is_default_completed ? 1 : 0],
                                        (err) => {
                                            if (err) console.error(`更新進度 ${name} 錯誤:`, err.message);
                                        }
                                    );
                                }
                            }
                        }
                    );
                });

                // 預先填入學分目標
                const initialTargets = [
                    ['major_required_total', 74],
                    ['elective_total', 54],
                    ['elective_literature_total', 18],
                    ['elective_writing_total', 4],
                    ['elective_mutual_total', 16],
                    ['minor_total', 27],
                    ['overall_total', 155]
                ];
                initialTargets.forEach(target => {
                    const [category, target_credits] = target;
                    db.run(
                        "INSERT OR IGNORE INTO credit_targets (category, target_credits) VALUES (?, ?)",
                        [category, target_credits],
                        (err) => {
                            if (err) console.error(`插入學分目標 ${category} 錯誤:`, err.message);
                        }
                    );
                });
            });
        }
    });
}

// 執行資料庫初始化
initDb();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'credit.html'));
});

// API 路由：獲取所有課程及其完成狀態
app.get('/api/courses', (req, res) => {
    const query = `
        SELECT c.course_id, c.name, c.type, c.subtype, c.credits, c.is_special_requirement, c.is_default_completed, sc.completed
        FROM courses c
        LEFT JOIN student_progress sc ON c.course_id = sc.course_id
        ORDER BY c.type, c.name
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ status: 'error', message: err.message });
        }
        res.json(rows.map(row => ({
            ...row,
            is_special_requirement: Boolean(row.is_special_requirement), // 將 SQLite 的 0/1 轉換為布林
            is_default_completed: Boolean(row.is_default_completed),
            completed: Boolean(row.completed) // 將 SQLite 的 0/1 轉換為布林
        })));
    });
});

// API 路由：更新課程完成狀態
app.post('/api/update_completion', (req, res) => {
    const { course_id, completed } = req.body;

    if (course_id === undefined || completed === undefined) {
        return res.status(400).json({ status: 'error', message: '缺少 course_id 或 completed 參數' });
    }

    db.get("SELECT is_default_completed FROM courses WHERE course_id = ?", [course_id], (err, row) => {
        if (err) {
            return res.status(500).json({ status: 'error', message: err.message });
        }
        if (row && row.is_default_completed) {
            return res.status(403).json({ status: 'error', message: '此課程為預設已完成，無法手動更改狀態。' });
        }

        db.run(
            "INSERT OR REPLACE INTO student_progress (course_id, completed) VALUES (?, ?)",
            [course_id, completed ? 1 : 0], 
            function(err) {
                if (err) {
                    return res.status(500).json({ status: 'error', message: err.message });
                }
                res.json({ status: 'success' });
            }
        );
    });
});

// API 路由：新增自訂課程
app.post('/api/add_custom_course', (req, res) => {
    const { name, credits, type, subtype } = req.body;

    if (!name || credits === undefined || !type) {
        return res.status(400).json({ status: 'error', message: '缺少課程名稱、學分或類型' });
    }

    const parsedCredits = parseInt(credits);
    if (isNaN(parsedCredits)) {
        return res.status(400).json({ status: 'error', message: '學分必須是有效數字' });
    }

    db.get("SELECT course_id FROM courses WHERE name = ?", [name], (err, row) => {
        if (err) { 
            console.error('查詢課程錯誤:', err.message);
            return res.status(500).json({ status: 'error', message: '查詢課程失敗。' });
        }

        if (row) {
            // 課程名稱已存在
            return res.status(409).json({ status: 'error', message: '課程名稱已存在，請使用不同的名稱。', course_id: row.course_id });
        }

        // 課程名稱不存在，可以進行插入
        db.run(
            "INSERT INTO courses (name, type, subtype, credits, max_credits_cap, is_special_requirement, is_default_completed) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [name, type, subtype || null, parsedCredits, null, false, false],
            function(err) {
                if (err) {
                    console.error('插入新課程錯誤:', err.message);
                    return res.status(500).json({ status: 'error', message: err.message });
                }

                let courseId = this.lastID; 

                console.log(`新課程 '${name}' (ID: ${courseId}) 已成功插入。`);
                db.run(
                    "INSERT OR REPLACE INTO student_progress (course_id, completed) VALUES (?, ?)",
                    [courseId, 0],
                    (progressErr) => {
                        if (progressErr) {
                            console.error(`初始化新課程 ${name} 進度錯誤:`, progressErr.message);
                            return res.status(500).json({ status: 'error', message: progressErr.message });
                        }
                        res.json({ status: 'success', course_id: courseId, message: '新課程已成功新增並初始化進度。' });
                    }
                );
            }
        );
    });  
}); 

// API 路由：計算學分進度
app.get('/api/calculate_progress', (req, res) => {
    const completedCreditsQuery = `
        SELECT c.type, c.subtype, SUM(c.credits) as completed_credits
        FROM courses c
        JOIN student_progress sc ON c.course_id = sc.course_id
        WHERE sc.completed = 1 AND c.is_special_requirement = 0
        GROUP BY c.type, c.subtype
    `;

    const specialReqQuery = `
        SELECT c.name, sc.completed
        FROM courses c
        JOIN student_progress sc ON c.course_id = sc.course_id
        WHERE c.is_special_requirement = 1
    `;

    const targetsQuery = `
        SELECT category, target_credits FROM credit_targets
    `;

    const progress = {};

    db.all(completedCreditsQuery, [], (err, completedRows) => {
        if (err) {
            console.error('查詢已完成學分錯誤:', err.message);
            return res.status(500).json({ status: 'error', message: err.message });
        }

        const completedCreditsByCategory = {};
        completedRows.forEach(row => {
            let categoryKey;
            if (row.type === 'elective' && row.subtype) {
                categoryKey = `elective_${row.subtype}`;
            } else {
                categoryKey = row.type;
            }
            completedCreditsByCategory[categoryKey] = (completedCreditsByCategory[categoryKey] || 0) + row.completed_credits;
        });

        const categoriesToCheck = [
            'required_common', 'required_year1', 'required_year2', 'required_year3', 'required_year4',
            'elective_literature', 'elective_writing', 'elective', 'elective_mutual',
            'minor_required', 
        ];
        categoriesToCheck.forEach(cat => {
            if (completedCreditsByCategory[cat] === undefined) {
                completedCreditsByCategory[cat] = 0;
            }
        });

        db.all(specialReqQuery, [], (err, specialReqRows) => {
            if (err) {
                console.error('查詢特殊要求錯誤:', err.message);
                return res.status(500).json({ status: 'error', message: err.message });
            }
            const specialRequirementsStatus = {};
            specialReqRows.forEach(row => {
                specialRequirementsStatus[row.name] = Boolean(row.completed);
            });

            db.all(targetsQuery, [], (err, targetRows) => {
                if (err) {
                    console.error('查詢學分目標錯誤:', err.message);
                    return res.status(500).json({ status: 'error', message: err.message });
                }

                const targets = {};
                targetRows.forEach(row => {
                    targets[row.category] = row.target_credits;
                });

                const getCompleted = (category) => completedCreditsByCategory[category] || 0;
                const getTarget = (category) => targets[category] || 0;

                // --- 外系選修計算 ---
                const maxmutualCredits = 16;
                const completedmutual = getCompleted('elective_mutual');
                const actualCountedmutual = Math.min(completedmutual, maxmutualCredits); 
                const targetmutual = getTarget('elective_mutual_total');

                progress.elective_mutual = {
                    completed: actualCountedmutual,
                    target: targetmutual,
                    remaining: Math.max(0, targetmutual - actualCountedmutual)
                };

                // 必修進度
                const completedMajorRequired =
                    getCompleted('required_common') +
                    getCompleted('required_year1') +
                    getCompleted('required_year2') +
                    getCompleted('required_year3') +
                    getCompleted('required_year4');
                const targetMajor = getTarget('major_required_total');
                progress.major_required = {
                    completed: completedMajorRequired,
                    target: targetMajor,
                    remaining: Math.max(0, targetMajor - completedMajorRequired)
                };

                // 選修學分總進度 (包含文學、寫作、一般選修和計入上限後的共同選修)
                const completedElectiveTotal =
                    getCompleted('elective_literature') +
                    getCompleted('elective_writing') +
                    getCompleted('elective') + 
                    actualCountedmutual;
                const targetElectiveTotal = getTarget('elective_total');
                progress.elective_overall = {
                    completed: completedElectiveTotal,
                    target: targetElectiveTotal,
                    remaining: Math.max(0, targetElectiveTotal - completedElectiveTotal)
                };

                // 文學類選修
                const completedLiteratureElective = getCompleted('elective_literature');
                const targetLiteratureElective = getTarget('elective_literature_total');
                progress.elective_literature = {
                    completed: completedLiteratureElective,
                    target: targetLiteratureElective,
                    remaining: Math.max(0, targetLiteratureElective - completedLiteratureElective)
                };

                // 寫作類選修
                const completedWritingElective = getCompleted('elective_writing');
                const targetWritingElective = getTarget('elective_writing_total');
                progress.elective_writing = {
                    completed: completedWritingElective,
                    target: targetWritingElective,
                    remaining: Math.max(0, targetWritingElective - completedWritingElective)
                };

                // 輔系學分
                const maxminorCredits = 24;
                const completedminor = getCompleted('minor_required');
                const actualCountedminor = Math.min(completedminor, maxminorCredits); 
                const targetMinor = getTarget('minor_total');

                progress.minor = {
                    completed: actualCountedminor,
                    target: targetMinor,
                    remaining: Math.max(0, targetMinor - actualCountedminor)
                };

                // 總學分進度
                const overallCompleted =
                    completedMajorRequired +
                    completedElectiveTotal +
                    actualCountedminor;
                const overallTarget = getTarget('overall_total');
                progress.overall = {
                    completed: overallCompleted,
                    target: overallTarget,
                    remaining: Math.max(0, overallTarget - overallCompleted)
                };

                progress.special_requirements = specialRequirementsStatus;

                res.json(progress);
            });
        });
    });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`Node.js Express 伺服器正在運行在 http://localhost:${PORT}`);
    console.log(`請在瀏覽器中開啟 http://localhost:${PORT}`);
});