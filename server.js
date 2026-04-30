const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. 中间件配置
app.use(cors());
app.use(express.json());

// 2. 配置 Multer：设置图片的临时存储位置和重命名规则
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 先临时存在本地的 uploads 文件夹里
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        // 给图片重命名，防止重名覆盖 (时间戳 + 原始后缀)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'ocr-image-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// 3. 核心 API 接口：接收前端上传的图片
app.post('/api/v1/recognize', upload.single('formula_image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请上传一张公式图片！' });
        }

        console.log(`📸 收到新的 OCR 任务，图片已保存至: ${req.file.path}`);

        // TODO: 这里将来会调用大模型的推理接口或者丢进 AWS SQS 队列
        // 目前我们先 mock (模拟) 一个返回结果，证明通道打通了
        
        const mockResponse = {
            task_id: `task_${Date.now()}`,
            status: 'success',
            original_image: req.file.filename,
            recognized_latex: "\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}", // 模拟大模型的完美输出
            message: "图片接收成功，已完成伪识别！"
        };

        res.status(200).json(mockResponse);

    } catch (error) {
        console.error("处理上传失败:", error);
        res.status(500).json({ error: '服务器内部处理错误' });
    }
});

// 4. 启动服务
app.listen(PORT, () => {
    console.log(`🚀 Hermes API Gateway 启动成功！监听端口: http://localhost:${PORT}`);
    console.log(`👉 请确保项目根目录下有一个名为 'uploads' 的空文件夹。`);
});