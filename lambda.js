const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(cors());
app.use(express.json());

// 1. 初始化 S3 客户端（部署到 AWS 后会自动获取环境变量里的权限）
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME;

// ⚠️ 记得把这里换成你 Kaggle 跑出来的那个 localtunnel 网址
const KAGGLE_URL = "https://game-radiator-padding.ngrok-free.dev";

// ==========================================
// 接口 A：前端来索要 S3 的上传“通行证”
// ==========================================
app.get('/api/v1/upload-url', async (req, res) => {
    try {
        // 生成一个随机的不重复文件名
        const fileName = `formula_${Date.now()}_${Math.round(Math.random() * 1000)}.jpg`;
        
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            ContentType: 'image/jpeg' 
        });

        // 找 AWS 要一个有效期为 5 分钟的直传 URL
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        res.status(200).json({
            upload_url: signedUrl,
            file_name: fileName
        });
    } catch (error) {
        console.error("获取预签名链接失败:", error);
        res.status(500).json({ error: "服务器内部错误，无法获取上传凭证" });
    }
});

// ==========================================
// 接口 B：前端通知“传完了”，呼叫大模型推理
// ==========================================
app.post('/api/v1/recognize', async (req, res) => {
    const { file_name } = req.body;
    
    if (!file_name) {
        return res.status(400).json({ error: "缺少 S3 文件名" });
    }

    // 拼装出这张图片在云端的完整访问地址
    const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${file_name}`;
    console.log(`准备让大模型识别图片: ${s3Url}`);

    try {
        // 将包含了图片 URL 的指令发给 Kaggle 算力节点
        const response = await fetch(`${KAGGLE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: "提取并识别这张公式图片",
                image_url: s3Url
            })
        });

        if (!response.ok) throw new Error("算力节点异常");
        
        const data = await response.json();

        res.status(200).json({
            status: 'success',
            recognized_latex: data.recognized_latex
        });

    } catch (error) {
        console.error("转发 Kaggle 失败:", error);
        res.status(500).json({ error: "无法连接到大模型推理节点" });
    }
});

module.exports.handler = serverless(app);