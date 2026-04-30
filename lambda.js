const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 核心 API 路由
app.post('/api/v1/recognize', async (req, res) => {
    // 注意：在真实的 AWS API Gateway 中处理图片上传（二进制流），
    // 往往比本地更复杂，通常会结合直接上传 S3 的预签名 URL。
    // 这里我们先打通云端连通性。
    res.status(200).json({
        task_id: `task_${Date.now()}`,
        status: 'success',
        message: 'Hello from AWS Lambda!',
        recognized_latex: "\\int_{0}^{\\infty} x^2 dx"
    });
});

// 导出被 serverless-http 包裹的 app，供 AWS Lambda 调用
module.exports.handler = serverless(app);